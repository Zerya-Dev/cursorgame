import Phaser from "phaser";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../config";
import { COLOR_STATIONS, DOORS, OBSTACLES, PLATES } from "../level";
import type { ColorStation, Door, Obstacle, PressurePlate } from "../level";
import { MultiplayerClient } from "../network/MultiplayerClient";
import type { RoomState } from "../network/state";

interface DoorRuntime {
  def: Door;
  solid: boolean;
  rect: Phaser.GameObjects.Rectangle;
}

interface RemotePlayer {
  cursor: Phaser.GameObjects.Arc;
  target: Phaser.Math.Vector2;
  trailAnchor: Phaser.Math.Vector2;
  color: number;
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
  private localTrailAnchor = new Phaser.Math.Vector2();
  private localColor = 0x4ade80;
  private pointerLocked = false;
  private hint!: Phaser.GameObjects.Text;
  private doors: DoorRuntime[] = [];
  private plates: PlateRuntime[] = [];
  private multiplayer?: MultiplayerClient;
  private remotePlayers = new Map<string, RemotePlayer>();
  private activeColorStation?: string;
  private readonly radius = 12;
  private readonly sensitivity = 0.82;
  private readonly movementResponse = 14;
  private readonly maxSpeed = 1400;
  private readonly trailSpacing = 10;

  constructor() {
    super("GameScene");
  }

  create() {
    this.physics?.world?.setBounds?.(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawLevel();
    this.buildGameplay();

    this.input.setDefaultCursor("none");

    const startX = WORLD_WIDTH / 2;
    const startY = WORLD_HEIGHT / 2;
    this.cursor = this.add.circle(startX, startY, this.radius, 0x4ade80);
    this.cursor.setStrokeStyle(3, 0xffffff);
    this.cursor.setDepth(10);
    this.localTrailAnchor.set(startX, startY);

    this.cameras.main.startFollow(this.cursor, true, 0.35, 0.35);
    this.cameras.main.setDeadzone(100, 80);

    this.hint = this.add
      .text(12, 12, "Click to catch the cursor", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#8888aa",
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.input.on("pointerdown", () => {
      if (!this.input.mouse?.locked) {
        this.input.mouse?.requestPointerLock();
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.input.mouse?.locked) {
        this.pendingInput.x += pointer.movementX;
        this.pendingInput.y += pointer.movementY;
      }
    });

    this.input.keyboard?.on("keydown-ESC", () => this.input.mouse?.releasePointerLock());

    this.multiplayer = new MultiplayerClient({
      onState: (state, sessionId) => this.syncState(state, sessionId),
      onConnected: () => this.hint.setText("Connected - click to catch the cursor"),
      onDisconnected: () => {
        this.clearRemotePlayers();
        if (this.scene.isActive()) this.hint.setText("Disconnected from server");
      },
      onError: (error) => {
        console.error("Could not connect to the game server", error);
        if (this.scene.isActive()) this.hint.setText("Could not connect to server");
      },
    });
    void this.multiplayer.connect();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      void this.multiplayer?.disconnect();
      this.multiplayer = undefined;
      this.clearRemotePlayers();
    });
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

    const decay = Math.exp(-this.movementResponse * dt);
    const travelScale = (1 - decay) / this.movementResponse;
    const dx = this.velocity.x * travelScale;
    const dy = this.velocity.y * travelScale;
    this.velocity.scale(decay);

    this.moveAndCollide(dx, dy);

    this.updateRemotePlayers(dt);
    this.emitTrail(this.cursor.x, this.cursor.y, this.localTrailAnchor, this.localColor);
    this.multiplayer?.publishPosition(_time, this.cursor.x, this.cursor.y);
    this.updateColorStation();
  }

  private syncState(state: RoomState, localSessionId: string) {
    const activePlayers = new Set<string>();

    state.players.forEach((player, sessionId) => {
      const color = this.parseColor(player.color);
      if (sessionId === localSessionId) {
        this.localColor = color;
        this.cursor.setFillStyle(color);
        return;
      }
      activePlayers.add(sessionId);

      let remote = this.remotePlayers.get(sessionId);
      if (!remote) {
        const cursor = this.add.circle(player.x, player.y, this.radius, color);
        cursor.setStrokeStyle(3, 0xffffff).setDepth(9);
        remote = {
          cursor,
          target: new Phaser.Math.Vector2(player.x, player.y),
          trailAnchor: new Phaser.Math.Vector2(player.x, player.y),
          color,
        };
        this.remotePlayers.set(sessionId, remote);
      }
      remote.target.set(player.x, player.y);
      remote.color = color;
      remote.cursor.setFillStyle(color);
    });

    for (const [sessionId, remote] of this.remotePlayers) {
      if (!activePlayers.has(sessionId)) {
        remote.cursor.destroy();
        this.remotePlayers.delete(sessionId);
      }
    }

    state.doors.forEach((door, id) => {
      const runtime = this.doors.find(({ def }) => def.id === id);
      if (!runtime) return;
      runtime.solid = !door.open;
      runtime.rect.setAlpha(door.open ? 0.18 : 1);
    });
    state.plates.forEach((plate, id) => {
      const runtime = this.plates.find(({ def }) => def.id === id);
      if (!runtime) return;
      runtime.active = plate.active;
      runtime.rect.setFillStyle(plate.active ? 0x4ade80 : 0x9a6a2a);
    });
  }

  private clearRemotePlayers() {
    for (const remote of this.remotePlayers.values()) remote.cursor.destroy();
    this.remotePlayers.clear();
  }

  private updateRemotePlayers(dt: number) {
    const interpolation = 1 - Math.exp(-14 * dt);
    for (const remote of this.remotePlayers.values()) {
      const distance = Phaser.Math.Distance.Between(
        remote.cursor.x,
        remote.cursor.y,
        remote.target.x,
        remote.target.y,
      );
      if (distance > 400) remote.cursor.setPosition(remote.target.x, remote.target.y);
      else {
        remote.cursor.x = Phaser.Math.Linear(remote.cursor.x, remote.target.x, interpolation);
        remote.cursor.y = Phaser.Math.Linear(remote.cursor.y, remote.target.y, interpolation);
      }
      this.emitTrail(remote.cursor.x, remote.cursor.y, remote.trailAnchor, remote.color);
    }
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
      this.doors.push({ def, solid: true, rect });
    }

    for (const station of COLOR_STATIONS) {
      this.add
        .rectangle(station.x, station.y, station.width, station.height, this.parseColor(station.color), 0.7)
        .setOrigin(0, 0)
        .setStrokeStyle(3, 0xffffff, 0.65)
        .setDepth(1);
      this.add
        .text(station.x + station.width / 2, station.y + station.height + 8, station.label, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: station.color,
        })
        .setOrigin(0.5, 0)
        .setDepth(2);
    }
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

  private updateColorStation() {
    const station = COLOR_STATIONS.find((candidate) => this.overlaps(candidate));
    if (station?.color === this.activeColorStation) return;
    this.activeColorStation = station?.color;
    if (station) this.multiplayer?.setColor(station.color);
  }

  private overlaps(rect: ColorStation) {
    const cx = Phaser.Math.Clamp(this.cursor.x, rect.x, rect.x + rect.width);
    const cy = Phaser.Math.Clamp(this.cursor.y, rect.y, rect.y + rect.height);
    return (this.cursor.x - cx) ** 2 + (this.cursor.y - cy) ** 2 < this.radius ** 2;
  }

  private parseColor(color: string) {
    const parsed = Number.parseInt(color.replace(/^#/, ""), 16);
    return Number.isFinite(parsed) ? parsed : 0xffffff;
  }

  private emitTrail(x: number, y: number, anchor: Phaser.Math.Vector2, color: number) {
    let dx = x - anchor.x;
    let dy = y - anchor.y;
    let distance = Math.hypot(dx, dy);

    while (distance >= this.trailSpacing) {
      const step = this.trailSpacing / distance;
      anchor.x += dx * step;
      anchor.y += dy * step;

      const dot = this.add.circle(anchor.x, anchor.y, 6, color, 0.42);
      dot.setDepth(5);
      this.tweens.add({
        targets: dot,
        alpha: 0,
        scale: 0.25,
        duration: 220,
        ease: "Quad.easeOut",
        onComplete: () => dot.destroy(),
      });

      dx = x - anchor.x;
      dy = y - anchor.y;
      distance = Math.hypot(dx, dy);
    }
  }
}
