import Phaser from "phaser";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../config";
import {
  BUTTON,
  CHEESE,
  COLOR_STATIONS,
  DECORATIONS,
  DOORS,
  OBSTACLES,
  PLATES,
  plateCountLabel,
} from "@shared";
import type { Door, PressurePlate, Rect } from "@shared";
import { parseColor } from "./color";
import {
  ACCENT_ACTIVE,
  ACCENT_ACTIVE_CSS,
  ACCENT_DANGER,
  ACCENT_IDLE,
  FONT_HAND,
  INK,
  INK_CSS,
  INK_SOFT_CSS,
  PAPER,
} from "./palette";

/** texture that shows what is allowed to stand on a plate, or undefined if it takes anything */
function plateIcon(entityKind?: string): string | undefined {
  if (!entityKind) return undefined; // no filter -- anything counts, so no icon to show
  if (entityKind === "ball" || entityKind === "boulder") return "barrel";
  return "mouseInk"; // players only
}

export interface DoorRuntime {
  def: Door;
  solid: boolean;
  open: boolean;
  /** two leaves that part from the centre; each retracts into its own jamb */
  leaves: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  /** which screen axis the leaves slide along — doors can sit in either wall */
  axis: "x" | "y";
  closedPos: [number, number];
  openPos: [number, number];
}

export function animateDoor(scene: Phaser.Scene, runtime: DoorRuntime, opening: boolean) {
  scene.tweens.killTweensOf(runtime.leaves);
  runtime.leaves.forEach((leaf, i) => {
    scene.tweens.add({
      targets: leaf,
      [runtime.axis]: opening ? runtime.openPos[i] : runtime.closedPos[i],
      duration: 380,
      ease: opening ? "Back.easeIn" : "Back.easeOut",
    });
  });
}

export interface PlateRuntime {
  def: PressurePlate;
  active: boolean;
  /** colour wash under the ink, since tinting the pack art would be a no-op */
  glow: Phaser.GameObjects.Rectangle;
  plate: Phaser.GameObjects.Rectangle;
  /** absent when the plate has no entityKind filter, i.e. anything counts */
  icon?: Phaser.GameObjects.Image;
  countLabel: Phaser.GameObjects.Text;
}

export function animatePlate(scene: Phaser.Scene, runtime: PlateRuntime, active: boolean) {
  // idle plates stay empty so you can see what is standing on them. The glow
  // (highlight) and icon are left alone here -- only the outline pulses.
  runtime.glow.setFillStyle(active ? ACCENT_ACTIVE : ACCENT_IDLE, active ? 0.5 : 0);
  runtime.countLabel.setColor(active ? ACCENT_ACTIVE_CSS : INK_SOFT_CSS);

  scene.tweens.killTweensOf(runtime.plate);
  scene.tweens.add({
    targets: runtime.plate,
    scaleX: active ? 0.9 : 1.08,
    scaleY: active ? 0.9 : 1.08,
    duration: 140,
    yoyo: true,
    ease: "Quad.easeOut",
  });
}

const BUTTON_STAGES = [
  { label: "do NOT press this", fill: ACCENT_DANGER },
  { label: "seriously, stop", fill: 0xd08a3a },
  { label: "now look what you did", fill: 0x6b6459 },
];

export interface ButtonRuntime {
  stage: number;
  rect: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  pressTween?: Phaser.Tweens.Tween;
}

export function buildButton(scene: Phaser.Scene): ButtonRuntime {
  const centerX = BUTTON.x + BUTTON.width / 2;
  const centerY = BUTTON.y + BUTTON.height / 2;

  const rect = scene.add
    .rectangle(centerX, centerY, BUTTON.width, BUTTON.height, BUTTON_STAGES[0].fill, 1)
    .setOrigin(0.5)
    .setStrokeStyle(5, INK, 1)
    .setDepth(5);

  const label = scene.add
    .text(centerX, centerY, BUTTON_STAGES[0].label, {
      fontFamily: FONT_HAND,
      fontSize: "30px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: BUTTON.width - 24 },
    })
    .setOrigin(0.5)
    .setDepth(6);

  return { stage: -1, rect, label };
}

export function animateButtonPress(scene: Phaser.Scene, runtime: ButtonRuntime) {
  runtime.pressTween?.remove();
  runtime.rect.setScale(1);
  runtime.label.setScale(1);
  runtime.pressTween = scene.tweens.add({
    targets: [runtime.rect, runtime.label],
    scaleX: 0.92,
    scaleY: 0.88,
    duration: 90,
    yoyo: true,
    ease: "Quad.easeOut",
  });
}

export function updateButtonView(runtime: ButtonRuntime, stage: number) {
  if (runtime.stage === stage) return;
  runtime.stage = stage;
  const { label, fill } = BUTTON_STAGES[stage] ?? BUTTON_STAGES[BUTTON_STAGES.length - 1];
  runtime.label.setText(label);
  runtime.rect.setFillStyle(fill, 1);
}

/** world px covered by one floor cell (floor_cell.png is 64x64) */
const FLOOR_TILE = 72;
/** thickness of a stamped wall line, in world px */
const WALL_INK = 22;
/**
 * How finely an obstacle edge is probed for "is the neighbour solid here?".
 * Runs snap to this grid, so a coarse value leaves visible notches where two
 * walls meet -- keep it well under the wall weight.
 */
const EDGE_PROBE = 6;
/** slabs at or under this thickness are drawn as a single centred line */
const THIN_WALL = WALL_INK * 2.2;

const DEPTH_FLOOR = -10;
const DEPTH_SOLID = -9;
const DEPTH_WALL = -8;
const DEPTH_DECOR = -7;

function isSolidAt(x: number, y: number, skip: Rect) {
  for (const o of OBSTACLES) {
    if (o === skip) continue;
    if (x >= o.x && x <= o.x + o.width && y >= o.y && y <= o.y + o.height) return true;
  }
  return false;
}

/**
 * Runs along one edge of `rect`, returning the [from, to] spans that face open
 * floor. Spans buried inside a neighbouring obstacle are dropped so we never
 * draw a wall line through the middle of a solid mass.
 */
function exposedSpans(rect: Rect, side: "top" | "bottom" | "left" | "right") {
  const vertical = side === "left" || side === "right";
  const start = vertical ? rect.y : rect.x;
  const end = start + (vertical ? rect.height : rect.width);

  // a point just outside this edge, offset along the edge's normal
  const probe = (at: number) => {
    switch (side) {
      case "top":
        return { x: at, y: rect.y - EDGE_PROBE / 2 };
      case "bottom":
        return { x: at, y: rect.y + rect.height + EDGE_PROBE / 2 };
      case "left":
        return { x: rect.x - EDGE_PROBE / 2, y: at };
      case "right":
        return { x: rect.x + rect.width + EDGE_PROBE / 2, y: at };
    }
  };

  const spans: Array<[number, number]> = [];
  let runStart: number | null = null;

  for (let at = start; at <= end; at += EDGE_PROBE) {
    const p = probe(Math.min(at, end));
    // outside the world bounds there is no room to draw into, only blank
    // page: treat it as solid so we never stamp a wall facing off the map.
    const outOfBounds = p.x < 0 || p.x > WORLD_WIDTH || p.y < 0 || p.y > WORLD_HEIGHT;
    const open = !outOfBounds && !isSolidAt(p.x, p.y, rect);
    if (open && runStart === null) runStart = at;
    if (!open && runStart !== null) {
      spans.push([runStart, at]);
      runStart = null;
    }
  }
  if (runStart !== null) spans.push([runStart, end]);

  return spans.filter(([from, to]) => to - from > EDGE_PROBE / 2);
}

/** merge two span lists into one, collapsing anything that touches or overlaps */
function unionSpans(a: Array<[number, number]>, b: Array<[number, number]>) {
  const all = [...a, ...b].sort((p, q) => p[0] - q[0]);
  const merged: Array<[number, number]> = [];
  for (const span of all) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([...span] as [number, number]);
  }
  return merged;
}

interface WallSegment {
  from: number;
  to: number;
  fixed: number;
  vertical: boolean;
}

function stampWall(scene: Phaser.Scene, seg: WallSegment) {
  const { from, to, fixed, vertical } = seg;
  // Run a full line-weight past each end. Corners are formed by two runs from
  // *different* obstacle rects, so they only close if both overshoot into the
  // solid mass behind them.
  const a = from - WALL_INK;
  const b = to + WALL_INK;
  const length = b - a;
  const mid = (a + b) / 2;

  // wall_seam.png (96x48) is wall.png with its drawn end-caps cropped off, so
  // it tiles into one continuous wobbling ink line instead of a row of closed
  // boxes. Scale both axes equally to keep the wobble from being squashed.
  const scale = WALL_INK / 48;
  // Always lay it out horizontally (length along local x, matching the
  // texture's own orientation) then rotate 90 for vertical runs -- tileScale
  // applies in the texture's pre-rotation axes, so swapping width/height
  // instead of rotating would sample the wrong part of the source.
  const strip = scene.add
    .tileSprite(vertical ? fixed : mid, vertical ? mid : fixed, length, WALL_INK, "wall_seam")
    .setOrigin(0.5)
    .setTileScale(scale, scale)
    .setDepth(DEPTH_WALL);

  if (vertical) strip.setAngle(90);
}

/**
 * wall_seam is a hollow two-line tube, not a solid stroke -- fine down a
 * straight run, but where a horizontal and a vertical run cross it reads as
 * four lines tangled together instead of a corner. Cap every such crossing
 * with a solid ink blot so it reads as one deliberate joint.
 */
function stampWallCrossings(scene: Phaser.Scene, segments: WallSegment[]) {
  const horizontals = segments.filter((s) => !s.vertical);
  const verticals = segments.filter((s) => s.vertical);
  const capRadius = WALL_INK * 0.6;

  for (const h of horizontals) {
    const hFrom = h.from - WALL_INK;
    const hTo = h.to + WALL_INK;
    for (const v of verticals) {
      const vFrom = v.from - WALL_INK;
      const vTo = v.to + WALL_INK;
      const crosses = v.fixed >= hFrom && v.fixed <= hTo && h.fixed >= vFrom && h.fixed <= vTo;
      if (!crosses) continue;
      scene.add.circle(v.fixed, h.fixed, capRadius, INK, 1).setDepth(DEPTH_WALL);
    }
  }
}

export function drawLevel(scene: Phaser.Scene) {
  // paper grid over the whole world; obstacles paint back over it below
  scene.add
    .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "floor_cell")
    .setOrigin(0, 0)
    .setTileScale(FLOOR_TILE / 64)
    // floor_cell.png only carries its top/left border (the right/bottom are
    // baked out) so adjacent tiles share a single seam instead of doubling it
    .setAlpha(0.85)
    .setDepth(DEPTH_FLOOR);

  // Solid mass reads as blank paper: no floor grid "behind" the walls, so the
  // rooms are what the grid picks out.
  const solid = scene.add.graphics().setDepth(DEPTH_SOLID);
  solid.fillStyle(PAPER, 1);
  for (const o of OBSTACLES) solid.fillRect(o.x, o.y, o.width, o.height);

  const cheese = scene.add
    .image(CHEESE.x, CHEESE.y, "cheese")
    .setDisplaySize(CHEESE.size, CHEESE.size)
    .setDepth(DEPTH_DECOR);
  // a slow bob so the goal reads as the one live thing in the room
  scene.tweens.add({
    targets: cheese,
    y: CHEESE.y - 8,
    duration: 1400,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  for (const decor of DECORATIONS) {
    scene.add
      .image(decor.x, decor.y, decor.sprite)
      .setDisplaySize(decor.size ?? 72, decor.size ?? 72)
      .setRotation(Phaser.Math.DegToRad(decor.rotation ?? 0))
      .setDepth(DEPTH_DECOR);
  }

  const segments: WallSegment[] = [];

  for (const o of OBSTACLES) {
    // A slab only a couple of line weights thick IS a wall, not a mass with two
    // faces. Drawing both of its edges leaves a pale gap between them and it
    // reads as a hollow tube, so thin slabs get one line down the spine.
    if (o.height <= THIN_WALL) {
      const spine = o.y + o.height / 2;
      for (const [from, to] of unionSpans(exposedSpans(o, "top"), exposedSpans(o, "bottom"))) {
        segments.push({ from, to, fixed: spine, vertical: false });
      }
    } else {
      for (const [from, to] of exposedSpans(o, "top")) {
        segments.push({ from, to, fixed: o.y, vertical: false });
      }
      for (const [from, to] of exposedSpans(o, "bottom")) {
        segments.push({ from, to, fixed: o.y + o.height, vertical: false });
      }
    }

    if (o.width <= THIN_WALL) {
      const spine = o.x + o.width / 2;
      for (const [from, to] of unionSpans(exposedSpans(o, "left"), exposedSpans(o, "right"))) {
        segments.push({ from, to, fixed: spine, vertical: true });
      }
    } else {
      for (const [from, to] of exposedSpans(o, "left")) {
        segments.push({ from, to, fixed: o.x, vertical: true });
      }
      for (const [from, to] of exposedSpans(o, "right")) {
        segments.push({ from, to, fixed: o.x + o.width, vertical: true });
      }
    }
  }

  for (const seg of segments) stampWall(scene, seg);
  stampWallCrossings(scene, segments);

  // The canvas is 1920x1080 but the world is authored at roughly half that
  // density, so zoom in to keep objects at a readable on-screen size.
  // Handy while authoring levels: setZoom(0.35) frames the whole map.
  scene.cameras.main.setZoom(1.5);
}

export function buildInteractables(scene: Phaser.Scene) {
  const plates: PlateRuntime[] = PLATES.map((def) => {
    const cx = def.x + def.width / 2;
    const cy = def.y + def.height / 2;

    const glow = scene.add
      .rectangle(cx, cy, def.width * 0.78, def.height * 0.78, ACCENT_IDLE, 0)
      .setOrigin(0.5)
      .setDepth(1);

    // Frame only -- the middle stays empty so you can see what is standing on
    // it. The requirement is spelled out along the bottom edge instead.
    const plate = scene.add
      .rectangle(cx, cy, def.width, def.height, PAPER, 0)
      .setOrigin(0.5)
      .setStrokeStyle(5, INK, 1)
      .setDepth(2);

    const iconSize = Math.min(def.width, def.height) * 0.3;
    const rowY = def.y + def.height - iconSize * 0.75;
    const iconKey = plateIcon(def.filter?.entityKind);

    let icon: Phaser.GameObjects.Image | undefined;
    if (iconKey && typeof iconKey === "string") {
      icon = scene.add
        .image(cx - iconSize * 0.55, rowY, iconKey)
        .setDisplaySize(iconSize, iconSize)
        .setDepth(3);
      if (def.filter?.color) icon.setTint(parseColor(def.filter.color));
    }

    // Without an icon (anything counts) the count reads alone, centred.
    const countLabel = scene.add
      .text(icon ? cx + iconSize * 0.35 : cx, rowY, plateCountLabel(def.count), {
        fontFamily: FONT_HAND,
        fontSize: `${Math.round(iconSize * 0.95)}px`,
        color: INK_SOFT_CSS,
      })
      .setOrigin(icon ? 0 : 0.5, 0.5)
      .setDepth(3);

    return { def, active: false, glow, plate, icon, countLabel };
  });

  const doors: DoorRuntime[] = DOORS.map((def) => {
    // A door can sit in a horizontal or a vertical wall; the leaves always part
    // along the opening, not along a fixed screen axis.
    const vertical = def.height > def.width;
    const axis = vertical ? "y" : "x";
    const span = vertical ? def.height : def.width;
    const thickness = vertical ? def.width : def.height;
    const half = span / 2;
    const start = vertical ? def.y : def.x;
    const cross = vertical ? def.x + def.width / 2 : def.y + def.height / 2;

    const closedPos: [number, number] = [start + half / 2, start + half + half / 2];
    // each leaf retracts a full leaf-length outward, clearing the opening
    const openPos: [number, number] = [closedPos[0] - half, closedPos[1] + half];

    const leaves = closedPos.map((pos, i) => {
      const leaf = scene.add
        .image(vertical ? cross : pos, vertical ? pos : cross, "doorLeaf")
        .setOrigin(0.5)
        // doorLeaf is drawn hinge-left/handle-right, so size it along the
        // opening first and only then rotate it into a vertical jamb. The
        // far leaf is mirrored so its hinge lands on its own jamb instead of
        // both leaves hinging on the same side.
        .setDisplaySize(half, thickness * 1.6)
        .setFlipX(i === 1)
        .setDepth(4);
      if (vertical) leaf.setAngle(90);
      return leaf;
    }) as [Phaser.GameObjects.Image, Phaser.GameObjects.Image];

    return { def, solid: true, open: false, leaves, axis, closedPos, openPos };
  });

  for (const station of COLOR_STATIONS) {
    const cx = station.x + station.width / 2;
    const cy = station.y + station.height / 2;

    // a rug with a blot of paint on it, rather than a flat swatch
    scene.add
      .image(cx, cy, "carpet")
      .setDisplaySize(station.width * 1.35, station.height * 1.35)
      .setDepth(1);
    scene.add
      .circle(
        cx,
        cy,
        Math.min(station.width, station.height) * 0.36,
        parseColor(station.color),
        0.9,
      )
      .setDepth(2);
    scene.add
      .text(cx, station.y + station.height + 10, station.label, {
        fontFamily: FONT_HAND,
        fontSize: "20px",
        color: INK_CSS,
      })
      .setOrigin(0.5, 0)
      .setDepth(3);
  }

  return { doors, plates };
}
