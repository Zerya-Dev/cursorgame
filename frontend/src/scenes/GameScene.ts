import Phaser from "phaser";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../config";
import { COLOR_STATIONS, OBSTACLES, PLAYER_RADIUS } from "@shared";
import type { Rect } from "@shared";
import { moveAndCollide } from "../gameplay/collision";
import { findColorStation, parseColor } from "../gameplay/color";
import { buildInteractables, drawLevel } from "../gameplay/levelView";
import type { DoorRuntime, PlateRuntime } from "../gameplay/levelView";
import { RenderPlayers } from "../gameplay/renderPlayers";
import { createEntityView } from "../entities/registry";
import type { EntityView, PredictionContext } from "../entities/registry";
import { MultiplayerClient } from "../network/MultiplayerClient";
import type { RoomState } from "../network/state";

export class GameScene extends Phaser.Scene {
  private cursor!: Phaser.GameObjects.Image;
  private cursorOutline!: Phaser.GameObjects.Image;
  private velocity = new Phaser.Math.Vector2();
  private pendingInput = new Phaser.Math.Vector2();
  private localColor = 0x4ade80;
  private pointerLocked = false;
  private hint!: Phaser.GameObjects.Text;
  private coordsLabel!: Phaser.GameObjects.Text;
  private doors: DoorRuntime[] = [];
  private plates: PlateRuntime[] = [];
  private multiplayer?: MultiplayerClient;
  private renderPlayers!: RenderPlayers;
  private entities = new Map<string, EntityView>();
  private activeColorStation?: string;
  private touchNavigation = false;
  private touchPointerId?: number;
  private previousTouch = new Phaser.Math.Vector2();
  private readonly radius = PLAYER_RADIUS;
  private readonly sensitivity = 0.82;
  private readonly movementResponse = 14;
  private readonly maxSpeed = 1400;

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.svg('cursorIcon', 'assets/cursor-alt-svgrepo-com.svg', {
      width: 48,
      height: 48
    });
  }

  create() {
    this.physics?.world?.setBounds?.(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    drawLevel(this);
    const { doors, plates } = buildInteractables(this);
    this.doors = doors;
    this.plates = plates;
    this.renderPlayers = new RenderPlayers(this, this.radius);

    this.touchNavigation = window.matchMedia("(pointer: coarse)").matches;

    const startX = WORLD_WIDTH / 2;
    const startY = WORLD_HEIGHT / 2;
    this.cursorOutline = this.add.image(startX, startY, 'cursorIcon');
    this.cursorOutline.setTint(0xffffff); // White outline
    this.cursorOutline.setScale(1.2);   // Slightly larger than original
    this.cursorOutline.setDepth(9);
    this.cursor = this.add.image(startX, startY, 'cursorIcon');
    this.cursor.setTint(this.localColor);
    this.cursor.setDepth(10);

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

    this.coordsLabel = this.add
      .text(0, 0, "", { fontFamily: "monospace", fontSize: "12px", color: "#8888aa" })
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);

    if (this.touchNavigation) this.updateHint();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.touchNavigation) {
        if (this.touchPointerId === undefined) {
          this.touchPointerId = pointer.id;
          this.previousTouch.set(pointer.x, pointer.y);
        }
        return;
      }
      if (!this.input.mouse?.locked) {
        this.input.mouse?.requestPointerLock();
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.touchNavigation && pointer.id === this.touchPointerId) {
        this.pendingInput.x += pointer.x - this.previousTouch.x;
        this.pendingInput.y += pointer.y - this.previousTouch.y;
        this.previousTouch.set(pointer.x, pointer.y);
        return;
      }
      if (this.input.mouse?.locked) {
        this.pendingInput.x += pointer.movementX;
        this.pendingInput.y += pointer.movementY;

      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.touchPointerId) this.touchPointerId = undefined;
    });

    this.input.keyboard?.on("keydown-ESC", () => this.input.mouse?.releasePointerLock());

    this.multiplayer = new MultiplayerClient({
      onState: (state, sessionId) => this.syncState(state, sessionId),
      onConnected: () => this.hint.setText("Connected - click to catch the cursor"),
      onDisconnected: () => {
        this.renderPlayers.clear();
        this.clearEntities();
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
      this.renderPlayers.clear();
      this.clearEntities();
    });
  }

  update(time: number, deltaMs: number) {
    const locked = this.touchNavigation || (this.input.mouse?.locked ?? false);
    if (locked !== this.pointerLocked) {
      this.pointerLocked = locked;
      this.updateHint(locked);
      if (!this.touchNavigation) this.input.setDefaultCursor(locked ? "none" : "default");
      if (!locked) {
        this.pendingInput.set(0, 0);
        this.velocity.set(0, 0);
      }
    }

    if (!locked && !this.touchNavigation) {
      const pointer = this.input.activePointer;
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.coordsLabel
        .setText(`${Math.round(world.x)}, ${Math.round(world.y)}`)
        .setPosition(pointer.x + 14, pointer.y + 14)
        .setVisible(true);
    } else {
      this.coordsLabel.setVisible(false);
    }

    const dt = Math.min(deltaMs / 1000, 0.05);

    this.velocity.x += this.pendingInput.x * this.sensitivity * this.movementResponse;
    this.velocity.y += this.pendingInput.y * this.sensitivity * this.movementResponse;
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

    const solids = this.collectSolids();
    const cursorFromX = this.cursor.x;
    const cursorFromY = this.cursor.y;
    moveAndCollide(this.cursor, this.velocity, this.radius, dx, dy, solids);

    this.renderPlayers.update(dt);
    this.updateEntities(dt, {
      sweep: {
        fromX: cursorFromX,
        fromY: cursorFromY,
        toX: this.cursor.x,
        toY: this.cursor.y,
        vx: (this.cursor.x - cursorFromX) / dt,
        vy: (this.cursor.y - cursorFromY) / dt,
      },
      solids,
    });
    this.multiplayer?.publishPosition(time, this.cursor.x, this.cursor.y);
    this.updateColorStation();
    this.cursorOutline.setPosition(this.cursor.x, this.cursor.y);
  }

  private syncState(state: RoomState, localSessionId: string) {
    this.renderPlayers.sync(state, localSessionId);

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

    const activeEntities = new Set<string>();
    state.entities.forEach((entity, id) => {
      activeEntities.add(id);
      let view = this.entities.get(id);
      if (!view) {
        view = createEntityView(this, entity);
        this.entities.set(id, view);
      }
      view.syncFromServer(entity);
    });
    for (const [id, view] of this.entities) {
      if (!activeEntities.has(id)) {
        view.destroy();
        this.entities.delete(id);
      }
    }
  }

  private updateEntities(dt: number, ctx: PredictionContext) {
    for (const view of this.entities.values()) view.update(dt, ctx);
  }

  private clearEntities() {
    for (const view of this.entities.values()) view.destroy();
    this.entities.clear();
  }

  private collectSolids(): Rect[] {
    const solids: Rect[] = [...OBSTACLES];
    for (const door of this.doors) {
      if (door.solid) solids.push(door.def);
    }
    return solids;
  }

  private updateColorStation() {
    const station = findColorStation(this.cursor, this.radius, COLOR_STATIONS);
    if (station?.color === this.activeColorStation) return;

    this.activeColorStation = station?.color;

    if (station) {
      this.localColor = parseColor(station.color);
      this.cursor.setTint(this.localColor);
      this.multiplayer?.setColor(station.color);
    }
  }

  private updateHint(locked = this.input.mouse?.locked ?? false) {
    if (this.touchNavigation) {
      this.hint.setText("Swipe anywhere to move");
      return;
    }
    this.hint.setText(
      locked ? "Cursor caught! Move the mouse (Esc to release)" : "Click to catch the cursor",
    );
  }
}
