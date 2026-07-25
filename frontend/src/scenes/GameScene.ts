import Phaser from "phaser";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../config";
import { DOORS, OBSTACLES, PLATES } from "../level";
import type { Door, Obstacle, PressurePlate } from "../level";

interface DoorRuntime {
  def: Door;
  solid: boolean;
  openUntil: number; // timestamp until which the door stays open after release
  rect: Phaser.GameObjects.Rectangle;
}

interface PlateRuntime {
  def: PressurePlate;
  active: boolean;
  rect: Phaser.GameObjects.Rectangle;
}

/**
 * Standalone scene: you control an in-game cursor across a world that is much
 * larger than the viewport. Click once to "catch" the cursor — this locks the
 * OS pointer, so mouse movement drives the in-game cursor freely and the camera
 * follows it around the world. Press Esc to release the pointer.
 */
export class GameScene extends Phaser.Scene {
  private cursor!: Phaser.GameObjects.Arc;
  private velocity = new Phaser.Math.Vector2();
  private pendingInput = new Phaser.Math.Vector2();
  private trailAnchor = new Phaser.Math.Vector2();
  private pointerLocked = false;
  private hint!: Phaser.GameObjects.Text;
  private doors: DoorRuntime[] = [];
  private plates: PlateRuntime[] = [];

  // How long a door stays open after its plate is released, so a single player
  // can step off and still make it through.
  private readonly doorHoldMs = 1200;

  // Radius of the cursor circle, used for collision.
  private readonly radius = 12;

  /**
   * Mouse movement is fed into a quickly decaying velocity instead of an
   * invisible target. Every mouse pixel still produces `sensitivity` world
   * pixels in total, but that distance is spread over a short period. This
   * turns bursty touchpad events into continuous motion without making a mouse
   * feel floaty.
   */
  private readonly sensitivity = 0.82;
  private readonly movementResponse = 14; // higher = sharper braking
  private readonly maxSpeed = 1400; // world pixels per second
  private readonly trailSpacing = 10;

  constructor() {
    super("GameScene");
  }

  create() {
    // The world (and the camera) span the full large map.
    this.physics?.world?.setBounds?.(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawLevel();
    this.buildGameplay();

    // Hide the OS cursor so only the in-game one is visible.
    this.input.setDefaultCursor("none");

    // Start in the middle of the world.
    const startX = WORLD_WIDTH / 2;
    const startY = WORLD_HEIGHT / 2;
    this.cursor = this.add.circle(startX, startY, this.radius, 0x4ade80);
    this.cursor.setStrokeStyle(3, 0xffffff);
    this.cursor.setDepth(10);
    this.trailAnchor.set(startX, startY);

    // The player already has smooth motion, so the camera should stay close
    // instead of adding another heavy layer of lag.
    this.cameras.main.startFollow(this.cursor, true, 0.35, 0.35);
    this.cameras.main.setDeadzone(100, 80);

    // On-screen hint, pinned to the camera (not the world).
    this.hint = this.add
      .text(12, 12, "Click to catch the cursor", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#8888aa",
      })
      .setScrollFactor(0)
      .setDepth(1000);

    // Click anywhere to request pointer lock ("catch" the cursor).
    this.input.on("pointerdown", () => {
      if (!this.input.mouse?.locked) {
        this.input.mouse?.requestPointerLock();
      }
    });

    // Pointer events can be irregular on touchpads, so collect their raw
    // movement and consume the whole batch once per game update.
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.input.mouse?.locked) {
        this.pendingInput.x += pointer.movementX;
        this.pendingInput.y += pointer.movementY;
      }
    });

    this.input.keyboard?.on("keydown-ESC", () => this.input.mouse?.releasePointerLock());
  }

  update(_time: number, deltaMs: number) {
    const locked = this.input.mouse?.locked ?? false;
    if (locked !== this.pointerLocked) {
      this.pointerLocked = locked;
      this.updateHint(locked);
      if (!locked) {
        this.pendingInput.set(0, 0);
        this.velocity.set(0, 0);
      }
    }

    const dt = Math.min(deltaMs / 1000, 0.05);

    this.velocity.x +=
      this.pendingInput.x * this.sensitivity * this.movementResponse;
    this.velocity.y +=
      this.pendingInput.y * this.sensitivity * this.movementResponse;
    this.pendingInput.set(0, 0);

    const speed = this.velocity.length();
    if (speed > this.maxSpeed) {
      this.velocity.scale(this.maxSpeed / speed);
    }

    // Integrate exponential drag exactly instead of approximating it per frame.
    const decay = Math.exp(-this.movementResponse * dt);
    const travelScale = (1 - decay) / this.movementResponse;
    const dx = this.velocity.x * travelScale;
    const dy = this.velocity.y * travelScale;
    this.velocity.scale(decay);

    this.moveAndCollide(dx, dy);

    // Gameplay checks happen after movement, so plates react on the same frame.
    this.updateGameplay();
    this.emitTrail();
  }

  /**
   * Move in small sub-steps so a fast flick cannot tunnel through a thin wall.
   * Resolving after each step also gives stable sliding around corners.
   */
  private moveAndCollide(dx: number, dy: number) {
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / (this.radius * 0.5)));
    for (let i = 0; i < steps; i++) {
      this.cursor.x += dx / steps;
      this.cursor.y += dy / steps;
      this.resolveCollisions();
    }
  }

  /**
   * Circle-vs-AABB collision resolution. For each overlapping obstacle, move
   * the cursor out along the shortest axis (the contact normal), so it slides
   * against walls instead of sticking or tunneling through.
   */
  private resolveCollisions() {
    for (const o of OBSTACLES) this.resolveRect(o);
    // Closed doors are solid too; open ones are passable.
    for (const d of this.doors) {
      if (d.solid) this.resolveRect(d.def);
    }
  }

  /** Push the cursor circle out of a single rectangle if they overlap. */
  private resolveRect(o: Obstacle) {
    const r = this.radius;
    // Closest point on the rectangle to the cursor center.
    const closestX = Phaser.Math.Clamp(this.cursor.x, o.x, o.x + o.width);
    const closestY = Phaser.Math.Clamp(this.cursor.y, o.y, o.y + o.height);

    const dx = this.cursor.x - closestX;
    const dy = this.cursor.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq >= r * r) return; // no overlap

    let normalX = 0;
    let normalY = 0;

    if (distSq > 0.0001) {
      // Cursor center is outside the rect: push out along the real normal.
      const dist = Math.sqrt(distSq);
      const push = r - dist;
      normalX = dx / dist;
      normalY = dy / dist;
      this.cursor.x += normalX * push;
      this.cursor.y += normalY * push;
    } else {
      // Center is inside the rect: eject along the nearest edge.
      const left = this.cursor.x - o.x;
      const right = o.x + o.width - this.cursor.x;
      const top = this.cursor.y - o.y;
      const bottom = o.y + o.height - this.cursor.y;
      const min = Math.min(left, right, top, bottom);
      if (min === left) {
        this.cursor.x = o.x - r;
        normalX = -1;
      } else if (min === right) {
        this.cursor.x = o.x + o.width + r;
        normalX = 1;
      } else if (min === top) {
        this.cursor.y = o.y - r;
        normalY = -1;
      } else {
        this.cursor.y = o.y + o.height + r;
        normalY = 1;
      }
    }

    // Remove only velocity aimed into the obstacle. Tangential velocity stays,
    // which is what makes movement glide along a wall instead of sticking.
    const intoWall = this.velocity.x * normalX + this.velocity.y * normalY;
    if (intoWall < 0) {
      this.velocity.x -= normalX * intoWall;
      this.velocity.y -= normalY * intoWall;
    }
  }

  /** Create the visual game objects for plates and doors. */
  private buildGameplay() {
    for (const def of PLATES) {
      const rect = this.add
        .rectangle(def.x, def.y, def.width, def.height, 0x9a6a2a)
        .setOrigin(0, 0)
        .setStrokeStyle(3, 0xd8a24a)
        .setDepth(1);
      this.plates.push({ def, active: false, rect });
    }
    for (const def of DOORS) {
      const rect = this.add
        .rectangle(def.x, def.y, def.width, def.height, 0xc94f4f)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xe88)
        .setDepth(2);
      this.doors.push({ def, solid: true, openUntil: 0, rect });
    }
  }

  /**
   * Pressure-plate logic. A plate is "pressed" while at least one occupant (the
   * cursor) stands on it. A pressed plate opens its doors immediately; once
   * released, its doors stay open for `doorHoldMs` before closing again.
   */
  private updateGameplay() {
    const now = this.time.now;

    // 1. Which doors should currently be held open?
    const holding = new Set<string>();
    for (const p of this.plates) {
      p.active = this.cursorOnPlate(p.def);
      // Plate glows brighter while pressed.
      p.rect.setFillStyle(p.active ? 0x4ade80 : 0x9a6a2a);
      if (p.active) for (const id of p.def.doorIds) holding.add(id);
    }

    // 2. Apply open/close state to each door (with the linger timer).
    for (const d of this.doors) {
      if (holding.has(d.def.id)) d.openUntil = now + this.doorHoldMs;
      const open = now < d.openUntil;
      d.solid = !open;
      d.rect.setAlpha(open ? 0.18 : 1);
    }
  }

  /** True if the cursor circle overlaps the plate rectangle. */
  private cursorOnPlate(p: PressurePlate): boolean {
    const cx = Phaser.Math.Clamp(this.cursor.x, p.x, p.x + p.width);
    const cy = Phaser.Math.Clamp(this.cursor.y, p.y, p.y + p.height);
    const dx = this.cursor.x - cx;
    const dy = this.cursor.y - cy;
    return dx * dx + dy * dy < this.radius * this.radius;
  }

  private updateHint(locked = this.input.mouse?.locked ?? false) {
    this.hint.setText(
      locked
        ? "Cursor caught — move the mouse (Esc to release)"
        : "Click to catch the cursor",
    );
  }

  /** Draw the level: a plain floor plus the hand-authored obstacle boxes. */
  private drawLevel() {
    const g = this.add.graphics();
    g.setDepth(0);

    // Floor.
    g.fillStyle(0x1b2647, 1);
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Obstacles: filled boxes with a lighter outline.
    for (const o of OBSTACLES) {
      g.fillStyle(0x3a4a6e, 1);
      g.fillRect(o.x, o.y, o.width, o.height);
      g.lineStyle(2, 0x6a7aa0, 1);
      g.strokeRect(o.x, o.y, o.width, o.height);
    }
  }

  // A temporary function, will probably be removed from the final game
  private emitTrail() {
    let dx = this.cursor.x - this.trailAnchor.x;
    let dy = this.cursor.y - this.trailAnchor.y;
    let distance = Math.hypot(dx, dy);

    while (distance >= this.trailSpacing) {
      const step = this.trailSpacing / distance;
      this.trailAnchor.x += dx * step;
      this.trailAnchor.y += dy * step;

      const dot = this.add.circle(
        this.trailAnchor.x,
        this.trailAnchor.y,
        6,
        0x4ade80,
        0.42,
      );
      dot.setDepth(5);
      this.tweens.add({
        targets: dot,
        alpha: 0,
        scale: 0.25,
        duration: 220,
        ease: "Quad.easeOut",
        onComplete: () => dot.destroy(),
      });

      dx = this.cursor.x - this.trailAnchor.x;
      dy = this.cursor.y - this.trailAnchor.y;
      distance = Math.hypot(dx, dy);
    }
  }
}
