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
  private target = new Phaser.Math.Vector2();
  private trail: Phaser.GameObjects.Arc[] = [];
  private hint!: Phaser.GameObjects.Text;
  private doors: DoorRuntime[] = [];
  private plates: PlateRuntime[] = [];

  // How long a door stays open after its plate is released, so a single player
  // can step off and still make it through.
  private readonly doorHoldMs = 1200;

  // Radius of the cursor circle, used for collision.
  private readonly radius = 12;
  // How quickly the cursor catches up to the target (0 = never, 1 = instant).
  private readonly followSpeed = 0.18;
  // How far a locked-pointer movement moves the target (px per mouse px).
  private readonly sensitivity = 1;
  // Max distance the target may lead the cursor. Stops the target running away
  // (and building up "owed" motion) while the cursor is stuck against a wall.
  private readonly maxLead = 48;

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
    this.target.set(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.cursor = this.add.circle(this.target.x, this.target.y, this.radius, 0x4ade80);
    this.cursor.setStrokeStyle(3, 0xffffff);
    this.cursor.setDepth(10);

    // Camera follows the in-game cursor around the world.
    this.cameras.main.startFollow(this.cursor, true, 0.1, 0.1);

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

    // While locked, movementX/Y give raw mouse deltas; move the world target.
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.input.mouse?.locked) {
        this.target.x = Phaser.Math.Clamp(
          this.target.x + pointer.movementX * this.sensitivity,
          0,
          WORLD_WIDTH,
        );
        this.target.y = Phaser.Math.Clamp(
          this.target.y + pointer.movementY * this.sensitivity,
          0,
          WORLD_HEIGHT,
        );
      }
    });

    // Keep the hint in sync with the lock state.
    this.input.on("pointerlockchange", () => this.updateHint());
    this.input.keyboard?.on("keydown-ESC", () => this.input.mouse?.releasePointerLock());
  }

  update() {
    // Update pressure plates / doors based on where the cursor currently is.
    this.updateGameplay();

    // Where the eased cursor wants to be this frame.
    const nextX = this.cursor.x + (this.target.x - this.cursor.x) * this.followSpeed;
    const nextY = this.cursor.y + (this.target.y - this.cursor.y) * this.followSpeed;

    // Move in sub-steps no larger than the radius so a fast mouse can't tunnel
    // straight through a thin wall in a single frame. Collisions are resolved
    // after each step, which also gives natural sliding along walls.
    const dx = nextX - this.cursor.x;
    const dy = nextY - this.cursor.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / this.radius));
    for (let i = 0; i < steps; i++) {
      this.cursor.x += dx / steps;
      this.cursor.y += dy / steps;
      this.resolveCollisions();
    }

    // Leash the target to the cursor. If the cursor is blocked, this keeps the
    // target from drifting far away, so it can't yank the cursor when a path
    // opens up. When moving freely, cursor ≈ target so this has no effect.
    const lx = this.target.x - this.cursor.x;
    const ly = this.target.y - this.cursor.y;
    const lead = Math.hypot(lx, ly);
    if (lead > this.maxLead) {
      const s = this.maxLead / lead;
      this.target.x = this.cursor.x + lx * s;
      this.target.y = this.cursor.y + ly * s;
    }

    this.spawnTrailDot(this.cursor.x, this.cursor.y);
    this.fadeTrail();
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

    if (distSq > 0.0001) {
      // Cursor center is outside the rect: push out along the real normal.
      const dist = Math.sqrt(distSq);
      const push = r - dist;
      this.cursor.x += (dx / dist) * push;
      this.cursor.y += (dy / dist) * push;
    } else {
      // Center is inside the rect: eject along the nearest edge.
      const left = this.cursor.x - o.x;
      const right = o.x + o.width - this.cursor.x;
      const top = this.cursor.y - o.y;
      const bottom = o.y + o.height - this.cursor.y;
      const min = Math.min(left, right, top, bottom);
      if (min === left) this.cursor.x = o.x - r;
      else if (min === right) this.cursor.x = o.x + o.width + r;
      else if (min === top) this.cursor.y = o.y - r;
      else this.cursor.y = o.y + o.height + r;
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

  private updateHint() {
    this.hint.setText(
      this.input.mouse?.locked
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

  private spawnTrailDot(x: number, y: number) {
    const dot = this.add.circle(x, y, 8, 0x4ade80, 0.5);
    dot.setDepth(5);
    this.trail.push(dot);
  }

  private fadeTrail() {
    for (const dot of this.trail) {
      dot.setScale(dot.scale * 0.88);
      dot.setAlpha(dot.alpha * 0.85);
    }
    // Retire fully-faded dots.
    this.trail = this.trail.filter((dot) => {
      if (dot.alpha < 0.02) {
        dot.destroy();
        return false;
      }
      return true;
    });
  }
}
