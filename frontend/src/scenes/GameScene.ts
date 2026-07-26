import Phaser from "phaser";
import { WORLD_HEIGHT, WORLD_WIDTH } from "@shared";
import {
  BUTTON,
  COLOR_STATIONS,
  CHEESE,
  ELECTRIC_SOURCE,
  END_CREDITS_GITHUB,
  GITHUB_URL,
  LAVA_ZONES,
  MOVING_LAVA_WALLS,
  MOVING_WALL_ROOM_LEFT,
  MOVING_WALL_ROOM_RIGHT,
  OBSTACLES,
  PLAYER_RADIUS,
  SPAWN_POINT,
  TRASH_PLATE_ID,
  WORLD_TEXTS,
  WORLD_TOP,
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
  updateCollectorProgress,
} from "../gameplay/levelView";
import type { ButtonRuntime, DoorRuntime, PlateRuntime } from "../gameplay/levelView";
import {
  buildLavaZones,
  buildMovingLavaWalls,
  findLavaZone,
  findMovingLavaHit,
  updateMovingLavaWalls,
} from "../gameplay/lava";
import type { MovingWallRuntime } from "../gameplay/lava";
import { SLIDE_DEFAULT_SPEED, SLIDE_MAX_MS, buildSlides, findSlide } from "../gameplay/slide";
import { buildWorldTexts } from "../gameplay/worldText";
import { buildElectricSource, setElectrified } from "../gameplay/electric";
import { FONT_HAND, INK_SOFT_CSS } from "../gameplay/palette";
import { RenderPlayers } from "../gameplay/renderPlayers";
import { SprayLayer } from "../gameplay/spray";
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
  private status!: Phaser.GameObjects.Text;
  private doors: DoorRuntime[] = [];
  private plates: PlateRuntime[] = [];
  private movingWalls: MovingWallRuntime[] = [];
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
    leg: number;
    speed: number;
    endsAt: number;
  };
  private touchNavigation = false;
  private touchPointerId?: number;
  private previousTouch = new Phaser.Math.Vector2();
  private noclip = false;
  private speedBoost = false;
  private readonly radius = PLAYER_RADIUS;
  private readonly sensitivity = 0.82;
  private readonly movementResponse = 14;
  private readonly maxSpeed = 1400;
  private readonly sprayMaxDurationMs = 2000;
  private readonly sprayNetworkIntervalMs = 25;
  private cheese!: Phaser.GameObjects.Image;
  private cheeseTouched = false;
  private githubLink!: Phaser.GameObjects.Rectangle;
  private githubEntered = false;

  constructor() {
    super("GameScene");
  }

  create() {
    this.physics?.world?.setBounds?.(0, WORLD_TOP, WORLD_WIDTH, WORLD_HEIGHT - WORLD_TOP);
    this.cameras.main.setBounds(0, WORLD_TOP, WORLD_WIDTH, WORLD_HEIGHT - WORLD_TOP);

    ({ cheese: this.cheese, githubLink: this.githubLink } = drawLevel(this));
    const { doors, plates } = buildInteractables(this);
    this.doors = doors;
    this.plates = plates;
    buildLavaZones(this, LAVA_ZONES);
    this.movingWalls = buildMovingLavaWalls(this, MOVING_LAVA_WALLS);
    buildSlides(this, 1);
    buildWorldTexts(this, WORLD_TEXTS);
    buildElectricSource(this, ELECTRIC_SOURCE);
    this.button = buildButton(this);
    this.renderPlayers = new RenderPlayers(this);

    this.touchNavigation = window.matchMedia("(pointer: coarse)").matches;

    const startX = SPAWN_POINT.x;
    const startY = SPAWN_POINT.y;
    this.cursor = this.add.image(startX, startY, "mouseBody");
    this.cursor.setTint(this.localColor);
    this.cursor.setDepth(9);
    this.cursorOutline = this.add.image(startX, startY, "mouseInk");
    this.cursorOutline.setDepth(10);

    this.sprayLayer = new SprayLayer(this);

    this.cameras.main.startFollow(this.cursor, true, 0.35, 0.35);
    this.cameras.main.setDeadzone(100, 80);

    this.status = this.add
      .text(16, 14, "", { fontFamily: FONT_HAND, fontSize: "22px", color: INK_SOFT_CSS })
      .setScrollFactor(0)
      .setDepth(1000);

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
    if (import.meta.env.DEV) {
      this.input.keyboard?.on("keydown-F2", (event: KeyboardEvent) => {
        if (event.repeat) return;
        this.noclip = !this.noclip;
        this.updateHint(this.pointerLocked);
      });
      this.input.keyboard?.on("keydown-F4", (event: KeyboardEvent) => {
        if (event.repeat) return;
        this.speedBoost = !this.speedBoost;
        this.updateHint(this.pointerLocked);
      });
    }

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

    const dt = Math.min(deltaMs / 1000, 0.05);

    updateMovingLavaWalls(
      this.movingWalls,
      Date.now(),
      MOVING_WALL_ROOM_LEFT,
      MOVING_WALL_ROOM_RIGHT,
    );

    const solids = this.collectSolids();
    const cursorFromX = this.cursor.x;
    const cursorFromY = this.cursor.y;

    if (this.updateSlide(time, dt)) {
      this.pendingInput.set(0, 0);
      this.velocity.set(0, 0);
    } else {
      const speedMultiplier = this.speedBoost ? 5 : 1;
      this.velocity.x +=
        this.pendingInput.x * this.sensitivity * this.movementResponse * speedMultiplier;
      this.velocity.y +=
        this.pendingInput.y * this.sensitivity * this.movementResponse * speedMultiplier;
      this.pendingInput.set(0, 0);

      const speed = this.velocity.length();
      const maxSpeed = this.maxSpeed * speedMultiplier;
      if (speed > maxSpeed) {
        this.velocity.scale(maxSpeed / speed);
      }
      if (speed > 5) {
        this.facingAngle = Math.atan2(this.velocity.y, this.velocity.x);
      }

      const decay = Math.exp(-this.movementResponse * dt);
      const travelScale = (1 - decay) / this.movementResponse;
      const dx = this.velocity.x * travelScale;
      const dy = this.velocity.y * travelScale;
      this.velocity.scale(decay);

      if (this.noclip) {
        this.cursor.x += dx;
        this.cursor.y += dy;
      } else {
        moveAndCollide(this.cursor, this.velocity, this.radius, dx, dy, solids);
      }
      if (!this.noclip) {
        this.updateLava();
        this.updateMovingLava();
      }
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
    this.updateEndCredits();
    this.updateSpray(time);
    const heading = this.facingAngle + Math.PI / 2;
    this.cursor.setRotation(heading);
    this.cursorOutline.setPosition(this.cursor.x, this.cursor.y).setRotation(heading);
  }

  private updateEndCredits() {
    const touchingCheese =
      Phaser.Math.Distance.Between(this.cursor.x, this.cursor.y, CHEESE.x, CHEESE.y) <
      this.radius + CHEESE.size / 2;
    if (touchingCheese && !this.cheeseTouched) {
      this.tweens.add({
        targets: this.cheese,
        angle: this.cheese.angle + 360,
        scale: 1.25,
        duration: 500,
        yoyo: true,
        ease: "Back.easeOut",
      });
    }
    this.cheeseTouched = touchingCheese;

    const enteredGithub = circleOverlapsRect(
      this.cursor.x,
      this.cursor.y,
      this.radius,
      END_CREDITS_GITHUB,
    );
    this.githubLink.setFillStyle(0xf2c14e, enteredGithub ? 0.55 : 0.25);
    if (enteredGithub && !this.githubEntered) {
      window.open(GITHUB_URL, "_blank", "noopener,noreferrer");
    }
    this.githubEntered = enteredGithub;
  }

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
    setElectrified(this, this.cursor, state.players.get(localSessionId)?.charged ?? false);

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
    updateButtonView(this.button, state.button.stage, state.button.clicks, state.button.target);

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

    const collector = this.plates.find(({ def }) => def.id === TRASH_PLATE_ID);
    if (collector) {
      let remaining = 0;
      state.entities.forEach((entity) => {
        if (entity.id.startsWith("prank-ball-")) remaining++;
      });
      updateCollectorProgress(collector, remaining, state.button.stage === 2);
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

  private updateMovingLava() {
    const wall = findMovingLavaHit(
      this.cursor,
      this.radius,
      MOVING_LAVA_WALLS,
      Date.now(),
      MOVING_WALL_ROOM_LEFT,
      MOVING_WALL_ROOM_RIGHT,
    );
    if (!wall) return;
    this.cursor.setPosition(wall.teleportTo.x, wall.teleportTo.y);
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
    const debugHint = import.meta.env.DEV
      ? `\nF2 noclip + lava immunity: ${this.noclip ? "on" : "off"}\nF4 speed: ${this.speedBoost ? "on" : "off"}`
      : "";
    if (this.touchNavigation) {
      this.status.setText(`swipe anywhere to scurry${debugHint}`);
      return;
    }
    this.status.setText(`${locked ? "esc to let go" : "click to grab the mouse"}${debugHint}`);
  }
}
