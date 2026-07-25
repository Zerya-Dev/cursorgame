import Phaser from "phaser";
import { WORLD_HEIGHT, WORLD_WIDTH } from "@shared";
import {
  BUTTON,
  COLOR_STATIONS,
  LAVA_ZONES,
  OBSTACLES,
  PLAYER_RADIUS,
  SPAWN_POINT,
  WORLD_TEXTS,
  circleOverlapsRect,
} from "@shared";
import type { Rect } from "@shared";
import { moveAndCollide } from "../gameplay/collision";
import { findColorStation, parseColor } from "../gameplay/color";
import {
  animateButtonPress,
  animateDoor,
  animatePlate,
  buildButton,
  buildInteractables,
  drawLevel,
  updateButtonView,
} from "../gameplay/levelView";
import type { ButtonRuntime, DoorRuntime, PlateRuntime } from "../gameplay/levelView";
import { buildLavaZones, findLavaZone } from "../gameplay/lava";
import { SLIDE_DEFAULT_SPEED, SLIDE_MAX_MS, buildSlides, findSlide } from "../gameplay/slide";
import { buildWorldTexts } from "../gameplay/worldText";
import { FONT_HAND, INK_SOFT_CSS } from "../gameplay/palette";
import { RenderPlayers } from "../gameplay/renderPlayers";
import { SprayLayer } from "../gameplay/spray";
import { createEntityView } from "../entities/registry";
import type { EntityView, PredictionContext } from "../entities/registry";
import { MultiplayerClient } from "../network/MultiplayerClient";
import type { RoomState } from "../network/state";

/**
 * basically rendering templates for everything
 */
export class GameScene extends Phaser.Scene {
  private cursor!: Phaser.GameObjects.Image;
  private cursorOutline!: Phaser.GameObjects.Image;
  private velocity = new Phaser.Math.Vector2();
  private pendingInput = new Phaser.Math.Vector2();
  private localColor = 0x4ade80;
  private pointerLocked = false;
  private status!: Phaser.GameObjects.Text;
  private coordsLabel!: Phaser.GameObjects.Text;
  private doors: DoorRuntime[] = [];
  private plates: PlateRuntime[] = [];
  private button!: ButtonRuntime;
  private multiplayer?: MultiplayerClient;
  private renderPlayers!: RenderPlayers;
  private entities = new Map<string, EntityView>();
  private activeColorStation?: string;
  private sprayLayer!: SprayLayer;
  private spraying = false;
  private sprayStartedAt = 0;
  private nextSprayUpdate = 0;
  private facingAngle = 0;
  private ride?: {
    path: Array<{ x: number; y: number }>;
    /** index of the waypoint currently being travelled toward */
    leg: number;
    speed: number;
    endsAt: number;
  };
  private touchNavigation = false;
  private touchPointerId?: number;
  private previousTouch = new Phaser.Math.Vector2();
  private readonly radius = PLAYER_RADIUS;
  private readonly sensitivity = 0.82;
  private readonly movementResponse = 14;
  private readonly maxSpeed = 1400;
  private readonly sprayMaxDurationMs = 2000;
  private readonly sprayNetworkIntervalMs = 25;

  constructor() {
    super("GameScene");
  }

  create() {
    this.physics?.world?.setBounds?.(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    drawLevel(this);
    const { doors, plates } = buildInteractables(this);
    this.doors = doors;
    this.plates = plates;
    buildLavaZones(this, LAVA_ZONES);
    buildSlides(this, 1);
    buildWorldTexts(this, WORLD_TEXTS);
    this.button = buildButton(this);
    this.renderPlayers = new RenderPlayers(this);

    this.touchNavigation = window.matchMedia("(pointer: coarse)").matches;

    const startX = SPAWN_POINT.x;
    const startY = SPAWN_POINT.y;
    // `cursor` stays the positioned object every other system already reads
    // (collision, camera, colour stations); the ink layer just follows it.
    this.cursor = this.add.image(startX, startY, "mouseBody");
    this.cursor.setTint(this.localColor);
    this.cursor.setDepth(9);
    this.cursorOutline = this.add.image(startX, startY, "mouseInk");
    this.cursorOutline.setDepth(10);

    this.sprayLayer = new SprayLayer(this);

    this.cameras.main.startFollow(this.cursor, true, 0.35, 0.35);
    this.cameras.main.setDeadzone(100, 80);

    // The narration proper lives on the dungeon floor (WORLD_TEXTS); this is
    // only for connection state, which has nowhere in-world to live.
    this.status = this.add
      .text(16, 14, "", { fontFamily: FONT_HAND, fontSize: "22px", color: INK_SOFT_CSS })
      .setScrollFactor(0)
      .setDepth(1000);

    this.coordsLabel = this.add
      .text(0, 0, "", { fontFamily: "monospace", fontSize: "12px", color: INK_SOFT_CSS })
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);

    if (this.touchNavigation) this.updateHint();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.setClicking(pointer.rightButtonDown() ? "right" : "left");
      if (pointer.rightButtonDown()) {
        this.spraying = true;
        this.sprayStartedAt = this.time.now;
        return;
      }
      if (
        (this.touchNavigation || this.input.mouse?.locked) &&
        circleOverlapsRect(this.cursor.x, this.cursor.y, this.radius, BUTTON)
      ) {
        animateButtonPress(this, this.button);
        this.multiplayer?.pressButton();
        return;
      }
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
      if (pointer.button === 2) this.stopSpraying();
      this.setClicking(null);
    });

    const stopSpray = () => this.stopSpraying();
    this.input.on("pointerout", stopSpray);
    this.game.events.on(Phaser.Core.Events.BLUR, stopSpray);

    this.input.keyboard?.on("keydown-ESC", () => this.input.mouse?.releasePointerLock());

    this.multiplayer = new MultiplayerClient({
      onState: (state, sessionId) => this.syncState(state, sessionId),
      onSpray: (x, y, angle, color) => this.sprayLayer.spray(this.time.now, x, y, angle, color),
      onButtonPress: () => animateButtonPress(this, this.button),
      onConnected: () => this.updateHint(),
      onDisconnected: () => {
        this.renderPlayers.clear();
        this.clearEntities();
        if (this.scene.isActive()) this.status.setText("the dungeon went quiet...");
      },
      onError: (error) => {
        console.error("Could not connect to the game server", error);
        if (this.scene.isActive()) this.status.setText("could not reach the dungeon");
      },
    });
    void this.multiplayer.connect();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      void this.multiplayer?.disconnect();
      this.multiplayer = undefined;
      this.renderPlayers.clear();
      this.clearEntities();
      this.game.events.off(Phaser.Core.Events.BLUR, stopSpray);
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

    const solids = this.collectSolids();
    const cursorFromX = this.cursor.x;
    const cursorFromY = this.cursor.y;

    if (this.updateSlide(time, dt)) {
      // riding: input is dropped on the floor rather than banked up, so you
      // don't get flung when the ride lets go
      this.pendingInput.set(0, 0);
      this.velocity.set(0, 0);
    } else {
      this.velocity.x += this.pendingInput.x * this.sensitivity * this.movementResponse;
      this.velocity.y += this.pendingInput.y * this.sensitivity * this.movementResponse;
      this.pendingInput.set(0, 0);

      const speed = this.velocity.length();
      if (speed > this.maxSpeed) {
        this.velocity.scale(this.maxSpeed / speed);
      }
      if (speed > 5) {
        this.facingAngle = Math.atan2(this.velocity.y, this.velocity.x);
      }

      const decay = Math.exp(-this.movementResponse * dt);
      const travelScale = (1 - decay) / this.movementResponse;
      const dx = this.velocity.x * travelScale;
      const dy = this.velocity.y * travelScale;
      this.velocity.scale(decay);

      moveAndCollide(this.cursor, this.velocity, this.radius, dx, dy, solids);
      this.updateLava();
    }

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
    this.updateSpray(time);
    // the art points up (-Y), facingAngle is measured from +X
    const heading = this.facingAngle + Math.PI / 2;
    this.cursor.setRotation(heading);
    this.cursorOutline.setPosition(this.cursor.x, this.cursor.y).setRotation(heading);
  }

  /**
   * Slides take control away and carry you to the exit. Movement here is
   * deliberately NOT collision-checked -- a chute that could snag on a wall
   * would strand the player, so the level data owns keeping the path clear.
   * Returns true while a ride is in progress.
   */
  private updateSlide(time: number, dt: number): boolean {
    if (!this.ride) {
      const slide = findSlide(this.cursor, this.radius);
      if (!slide) return false;
      this.ride = {
        path: slide.path,
        leg: 0,
        speed: slide.speed ?? SLIDE_DEFAULT_SPEED,
        endsAt: time + SLIDE_MAX_MS,
      };
    }

    // Budget for this frame, spent walking down the path. A single frame can
    // cross a short leg entirely, so keep consuming legs until it runs out.
    let budget = this.ride.speed * dt;

    while (budget > 0) {
      if (this.ride.leg >= this.ride.path.length || time >= this.ride.endsAt) {
        const last = this.ride.path[this.ride.path.length - 1];
        this.cursor.setPosition(last.x, last.y);
        this.ride = undefined;
        return false;
      }

      const target = this.ride.path[this.ride.leg];
      const dx = target.x - this.cursor.x;
      const dy = target.y - this.cursor.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= budget) {
        this.cursor.setPosition(target.x, target.y);
        budget -= distance;
        this.ride.leg += 1;
        continue;
      }

      this.cursor.x += (dx / distance) * budget;
      this.cursor.y += (dy / distance) * budget;
      this.facingAngle = Math.atan2(dy, dx);
      budget = 0;
    }

    return true;
  }

  private updateSpray(time: number) {
    if (this.spraying) {
      if (time - this.sprayStartedAt >= this.sprayMaxDurationMs) {
        this.stopSpraying();
      } else {
        this.sprayLayer.spray(
          time,
          this.cursor.x,
          this.cursor.y,
          this.facingAngle,
          this.localColor,
        );
        if (time >= this.nextSprayUpdate) {
          this.multiplayer?.spray(this.cursor.x, this.cursor.y, this.facingAngle, this.localColor);
          this.nextSprayUpdate = time + this.sprayNetworkIntervalMs;
        }
      }
    }
    this.sprayLayer.update(time);
  }

  private stopSpraying() {
    this.spraying = false;
  }

  /** swap the avatar's linework so which button is down is visible on the mouse itself */
  private setClicking(button: "left" | "right" | null) {
    this.cursorOutline.setTexture(
      button === "left"
        ? "mouseInkClickLeft"
        : button === "right"
          ? "mouseInkClickRight"
          : "mouseInk",
    );
    this.tweens.killTweensOf([this.cursor, this.cursorOutline]);
    this.tweens.add({
      targets: [this.cursor, this.cursorOutline],
      scaleX: button ? 0.92 : 1,
      scaleY: button ? 0.92 : 1,
      duration: 90,
      ease: "Quad.easeOut",
    });
  }

  private syncState(state: RoomState, localSessionId: string) {
    this.renderPlayers.sync(state, localSessionId);

    state.doors.forEach((door, id) => {
      const runtime = this.doors.find(({ def }) => def.id === id);
      if (!runtime) return;
      runtime.solid = !door.open;
      if (runtime.open !== door.open) {
        runtime.open = door.open;
        animateDoor(this, runtime, door.open);
      }
    });
    state.plates.forEach((plate, id) => {
      const runtime = this.plates.find(({ def }) => def.id === id);
      if (!runtime) return;
      if (runtime.active !== plate.active) {
        runtime.active = plate.active;
        animatePlate(this, runtime, plate.active);
      }
    });
    updateButtonView(this.button, state.button.stage);

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

  private updateLava() {
    const zone = findLavaZone(this.cursor, this.radius, LAVA_ZONES);
    if (!zone) return;
    this.cursor.setPosition(zone.teleportTo.x, zone.teleportTo.y);
    this.velocity.set(0, 0);
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
      this.status.setText("swipe anywhere to scurry");
      return;
    }
    this.status.setText(locked ? "esc to let go" : "click to grab the mouse");
  }
}
