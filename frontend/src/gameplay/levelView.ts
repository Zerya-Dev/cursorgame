import Phaser from "phaser";
import { WORLD_HEIGHT, WORLD_WIDTH } from "@shared";
import {
  BALL_SPAWN_COUNT,
  BUTTON,
  CHEESE,
  COLOR_STATIONS,
  DECORATIONS,
  DOORS,
  END_CREDITS_GITHUB,
  FOOTBALL_PITCH,
  MAIN_LOBBY_BOTTOM,
  OBSTACLES,
  POWERED_CAMPFIRE,
  PLATES,
  TRASH_PLATE_ID,
  WORLD_TOP,
  plateCountLabel,
} from "@shared";
import type { Door, PressurePlate, Rect } from "@shared";
import { parseColor } from "./color";
import {
  ACCENT_ACTIVE,
  ACCENT_ACTIVE_CSS,
  ACCENT_DANGER,
  ACCENT_IDLE,
  ACCENT_GOAL,
  FONT_HAND,
  INK,
  INK_CSS,
  INK_SOFT_CSS,
  PAPER,
} from "./palette";

function plateIcon(entityKind?: string): string | undefined {
  if (!entityKind) return undefined; // no filter -- anything counts, so no icon to show
  if (entityKind === "ball" || entityKind === "boulder") return "barrel";
  return "mouseInk"; // players only
}

export interface DoorRuntime {
  def: Door;
  solid: boolean;
  open: boolean;
  leaves: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  axis: "x" | "y";
  closedPos: [number, number];
  openPos: [number, number];
}

export interface PoweredCampfireRuntime {
  image: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  flames: Phaser.GameObjects.Arc[];
  powered: boolean;
  tween?: Phaser.Tweens.Tween;
}

export function buildPoweredCampfire(scene: Phaser.Scene): PoweredCampfireRuntime {
  const image = scene.add
    .image(POWERED_CAMPFIRE.x, POWERED_CAMPFIRE.y, "campfire")
    .setDisplaySize(POWERED_CAMPFIRE.size, POWERED_CAMPFIRE.size)
    .setDepth(3);
  const label = scene.add
    .text(POWERED_CAMPFIRE.x, POWERED_CAMPFIRE.y + POWERED_CAMPFIRE.size * 0.6, "", {
      fontFamily: FONT_HAND,
      fontSize: "24px",
      color: INK_CSS,
    })
    .setOrigin(0.5, 0)
    .setDepth(4);
  const flames = [
    scene.add.circle(POWERED_CAMPFIRE.x - 10, POWERED_CAMPFIRE.y - 18, 13, 0xd96f32),
    scene.add.circle(POWERED_CAMPFIRE.x + 9, POWERED_CAMPFIRE.y - 20, 11, 0xf2c14e),
    scene.add.circle(POWERED_CAMPFIRE.x, POWERED_CAMPFIRE.y - 32, 9, 0xf28c28),
  ];
  for (const flame of flames) flame.setVisible(false).setDepth(4);
  return { image, label, flames, powered: false };
}

export function setPoweredCampfire(
  scene: Phaser.Scene,
  runtime: PoweredCampfireRuntime,
  powered: boolean,
) {
  if (runtime.powered === powered) return;
  runtime.powered = powered;
  runtime.tween?.remove();
  runtime.tween = undefined;
  runtime.label.setText(powered ? "*fwoosh*" : "");
  runtime.flames.forEach((flame) => flame.setVisible(powered).setScale(1).setAlpha(1));
  if (powered) {
    runtime.tween = scene.tweens.add({
      targets: runtime.flames,
      scaleX: 0.72,
      scaleY: 1.35,
      alpha: 0.7,
      duration: 180,
      yoyo: true,
      repeat: -1,
      stagger: 55,
      ease: "Sine.easeInOut",
    });
  }
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
  glow: Phaser.GameObjects.Rectangle;
  plate: Phaser.GameObjects.Rectangle;
  icon?: Phaser.GameObjects.Image;
  countLabel: Phaser.GameObjects.Text;
  progress?: {
    fill: Phaser.GameObjects.Rectangle;
    width: number;
  };
}

export function updateCollectorProgress(runtime: PlateRuntime, remaining: number, active: boolean) {
  if (!runtime.progress) return;
  const collected = active ? BALL_SPAWN_COUNT - remaining : 0;
  const ratio = Phaser.Math.Clamp(collected / BALL_SPAWN_COUNT, 0, 1);
  runtime.progress.fill.width = runtime.progress.width * ratio;
}

export function animatePlate(scene: Phaser.Scene, runtime: PlateRuntime, active: boolean) {
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
  { label: "I asked you politely", fill: 0xd96f32 },
  { label: "that was not a suggestion", fill: 0xc95f32 },
  { label: "the button remembers", fill: 0xb45136 },
  { label: "you are testing my patience", fill: 0x98453b },
  { label: "go on. finish what you started.", fill: 0x7d3d43 },
  { label: "fine. good luck trying to clean this up.", fill: 0x6b6459 },
];

const BUTTON_MOVE_EVERY_CLICKS = 3;
const BUTTON_MOVE_RANGE_X = 280;
const BUTTON_MOVE_RANGE_Y = 180;

export interface ButtonRuntime {
  stage: number;
  messageIndex: number;
  movementStep: number;
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

  return { stage: -1, messageIndex: -1, movementStep: -1, rect, label };
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

export function updateButtonView(
  runtime: ButtonRuntime,
  stage: number,
  clicks: number,
  target: number,
) {
  const messageIndex =
    stage === 0
      ? 0
      : stage === 2
        ? BUTTON_STAGES.length - 1
        : 1 + Math.min(BUTTON_STAGES.length - 3, Math.floor((clicks / Math.max(1, target)) * 5));
  const moves = stage === 1 && messageIndex >= BUTTON_STAGES.length - 3;
  const movementStep = moves ? Math.floor(clicks / BUTTON_MOVE_EVERY_CLICKS) : -1;
  if (runtime.movementStep !== movementStep) {
    runtime.movementStep = movementStep;
    const centerX = BUTTON.x + BUTTON.width / 2;
    const centerY = BUTTON.y + BUTTON.height / 2;
    const randomX = moves ? Math.sin(movementStep * 12.9898) * 43758.5453 : 0.5;
    const randomY = moves ? Math.sin((movementStep + 31) * 78.233) * 43758.5453 : 0.5;
    const x = centerX + ((randomX - Math.floor(randomX)) * 2 - 1) * BUTTON_MOVE_RANGE_X;
    const y = centerY + ((randomY - Math.floor(randomY)) * 2 - 1) * BUTTON_MOVE_RANGE_Y;
    runtime.rect.setPosition(x, y);
    runtime.label.setPosition(x, y);
  }
  if (runtime.stage === stage && runtime.messageIndex === messageIndex) return;
  runtime.stage = stage;
  runtime.messageIndex = messageIndex;
  const { label, fill } = BUTTON_STAGES[messageIndex];
  runtime.label.setText(label);
  runtime.rect.setFillStyle(fill, 1);
}

const FLOOR_TILE = 72;
const WALL_INK = 22;
const EDGE_PROBE = 6;
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

function exposedSpans(rect: Rect, side: "top" | "bottom" | "left" | "right") {
  const vertical = side === "left" || side === "right";
  const start = vertical ? rect.y : rect.x;
  const end = start + (vertical ? rect.height : rect.width);

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
    const outOfBounds = p.x < 0 || p.x > WORLD_WIDTH || p.y < WORLD_TOP || p.y > WORLD_HEIGHT;
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
  const a = from - WALL_INK;
  const b = to + WALL_INK;
  const length = b - a;
  const mid = (a + b) / 2;

  const strip = scene.add
    .tileSprite(vertical ? fixed : mid, vertical ? mid : fixed, length, WALL_INK, "wall_seam")
    .setOrigin(0.5)
    .setTileScale(WALL_INK / 48, WALL_INK / 48)
    .setDepth(DEPTH_WALL);

  if (vertical) strip.setAngle(90);
}

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
  scene.add
    .tileSprite(0, 0, WORLD_WIDTH, MAIN_LOBBY_BOTTOM, "floor_cell")
    .setOrigin(0, 0)
    .setTileScale(FLOOR_TILE / 64)
    .setAlpha(0.85)
    .setDepth(DEPTH_FLOOR);
  scene.add
    .tileSprite(500, WORLD_TOP, 1000, -WORLD_TOP, "floor_cell")
    .setOrigin(0, 0)
    .setTileScale(FLOOR_TILE / 64)
    .setAlpha(0.85)
    .setDepth(DEPTH_FLOOR);

  const solid = scene.add.graphics().setDepth(DEPTH_SOLID);
  solid.fillStyle(PAPER, 1);
  for (const o of OBSTACLES) solid.fillRect(o.x, o.y, o.width, o.height);

  const pitch = scene.add.graphics().setDepth(DEPTH_DECOR);
  const { x, y, width, height } = FOOTBALL_PITCH;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  pitch.lineStyle(5, INK, 0.42);
  pitch.strokeRoundedRect(x, y, width, height, 12);
  pitch.lineBetween(x, centerY, x + width, centerY);
  pitch.strokeCircle(centerX, centerY, 42);
  pitch.strokeRect(centerX - 55, y, 110, 58);
  pitch.strokeRect(centerX - 55, y + height - 58, 110, 58);
  pitch.fillStyle(INK, 0.42);
  pitch.fillCircle(centerX, centerY, 5);

  const cheese = scene.add
    .image(CHEESE.x, CHEESE.y, "cheese")
    .setDisplaySize(CHEESE.size, CHEESE.size)
    .setDepth(DEPTH_DECOR);
  const githubLink = scene.add
    .rectangle(
      END_CREDITS_GITHUB.x + END_CREDITS_GITHUB.width / 2,
      END_CREDITS_GITHUB.y + END_CREDITS_GITHUB.height / 2,
      END_CREDITS_GITHUB.width,
      END_CREDITS_GITHUB.height,
      ACCENT_GOAL,
      0.25,
    )
    .setStrokeStyle(4, INK, 1)
    .setDepth(DEPTH_DECOR);
  scene.add
    .text(githubLink.x, githubLink.y, "enter to visit GitHub  ->", {
      fontFamily: FONT_HAND,
      fontSize: "27px",
      color: INK_CSS,
    })
    .setOrigin(0.5)
    .setDepth(DEPTH_DECOR + 1);

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

  scene.cameras.main.setZoom(1.5); // SCALE, ZOOM, SIZE (keywords lol)

  return { cheese, githubLink };
}

export function buildInteractables(scene: Phaser.Scene) {
  const plates: PlateRuntime[] = PLATES.filter((def) => !def.hidden).map((def) => {
    const cx = def.x + def.width / 2;
    const cy = def.y + def.height / 2;

    const glow = scene.add
      .rectangle(cx, cy, def.width * 0.78, def.height * 0.78, ACCENT_IDLE, 0)
      .setOrigin(0.5)
      .setDepth(1);

    const plate = scene.add
      .rectangle(cx, cy, def.width, def.height, PAPER, 0)
      .setOrigin(0.5)
      .setStrokeStyle(5, INK, 1)
      .setDepth(2);

    if (def.label) {
      scene.add
        .text(cx, def.y + 8, def.label, {
          fontFamily: FONT_HAND,
          fontSize: `${Math.min(18, Math.round(def.width / Math.max(5, def.label.length)))}px`,
          color: INK_CSS,
        })
        .setOrigin(0.5, 0)
        .setDepth(3);
    }

    const iconSize = Math.min(def.width, def.height) * 0.3;
    const rowY = def.y + def.height - iconSize * 0.75;
    const iconKey = plateIcon(def.filter?.entityKind);
    const hasIcon = Boolean(iconKey);

    let icon: Phaser.GameObjects.Image | undefined;
    if (iconKey && typeof iconKey === "string") {
      const iconX = cx - iconSize * 0.55;
      if (def.filter?.color) {
        const radius = iconSize * 0.3;
        const marker = scene.add.graphics().setDepth(3);
        marker.fillStyle(parseColor(def.filter.color), 1);
        marker.fillCircle(iconX, rowY, radius);
        marker.lineStyle(3, INK, 1);
        marker.strokeCircle(iconX, rowY, radius);
        marker.lineBetween(iconX, rowY - radius * 0.8, iconX, rowY + radius * 1.35);
      } else {
        icon = scene.add.image(iconX, rowY, iconKey).setDisplaySize(iconSize, iconSize).setDepth(3);
      }
    }

    const labelText = def.countLabel ?? plateCountLabel(def.count);
    const labelScale = labelText.length > 3 ? 0.55 : 0.95;
    const countLabel = scene.add
      .text(hasIcon ? cx + iconSize * 0.35 : cx, rowY, labelText, {
        fontFamily: FONT_HAND,
        fontSize: `${Math.round(iconSize * labelScale)}px`,
        color: INK_SOFT_CSS,
      })
      .setOrigin(hasIcon ? 0 : 0.5, 0.5)
      .setDepth(3);

    let progress: PlateRuntime["progress"];
    if (def.id === TRASH_PLATE_ID) {
      const width = def.width - 56;
      const x = def.x + 28;
      const y = def.y + 24;
      scene.add
        .rectangle(x, y, width, 22, PAPER, 1)
        .setOrigin(0, 0.5)
        .setStrokeStyle(4, INK, 1)
        .setDepth(3);
      const fill = scene.add.rectangle(x, y, 0, 12, ACCENT_ACTIVE, 1).setOrigin(0, 0.5).setDepth(4);
      progress = { fill, width };
    }

    return { def, active: false, glow, plate, icon, countLabel, progress };
  });

  const doors: DoorRuntime[] = DOORS.map((def) => {
    const vertical = def.height > def.width;
    const axis = vertical ? "y" : "x";
    const span = vertical ? def.height : def.width;
    const thickness = vertical ? def.width : def.height;
    const half = span / 2;
    const start = vertical ? def.y : def.x;
    const cross = vertical ? def.x + def.width / 2 : def.y + def.height / 2;

    const closedPos: [number, number] = [start + half / 2, start + half + half / 2];
    const openPos: [number, number] = [closedPos[0] - half, closedPos[1] + half];

    const leaves = closedPos.map((pos, i) => {
      const leaf = scene.add
        .image(vertical ? cross : pos, vertical ? pos : cross, "doorLeaf")
        .setOrigin(0.5)
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
