import Phaser from "phaser";
import {
  ENTITY_KINDS,
  PLAYER_RADIUS,
  applyFriction,
  applySweepPush,
  clampSpeed,
  integrateCircle,
} from "@shared";
import type { CircleBody, EntityKindConfig } from "@shared";
import type { EntityState } from "../network/state";
import type { EntityView, PredictionContext } from "./registry";

const SNAP_DISTANCE = 400;
const CORRECTION_RATE = 6;

function parseColor(color: string) {
  const parsed = Number.parseInt(color.replace(/^#/, ""), 16);
  return Number.isFinite(parsed) ? parsed : 0xffffff;
}

/**
 * Client-side prediction with the shared physics: local hits react instantly,
 * while a "ghost" body (hard-set to each server snapshot, then advanced by the
 * same physics without local input) is what the prediction reconciles against.
 */
export class BallView implements EntityView {
  readonly radius: number;
  private config: EntityKindConfig;
  private predicted: CircleBody;
  private ghost: CircleBody;
  private container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Arc;
  private fillColor: number;

  constructor(scene: Phaser.Scene, state: EntityState) {
    this.radius = state.radius;
    this.config = ENTITY_KINDS[state.kind] ?? ENTITY_KINDS.ball;
    this.predicted = { x: state.x, y: state.y, vx: state.vx, vy: state.vy, radius: state.radius };
    this.ghost = { ...this.predicted };

    this.fillColor = parseColor(state.color);
    this.body = scene.add.circle(0, 0, state.radius, this.fillColor);
    this.body.setStrokeStyle(3, 0xffffff, 0.5);
    const markers = [
      scene.add.circle(state.radius * 0.45, 0, state.radius * 0.2, 0x1b2647, 0.55),
      scene.add.circle(-state.radius * 0.45, 0, state.radius * 0.2, 0x1b2647, 0.55),
    ];
    this.container = scene.add.container(state.x, state.y, [this.body, ...markers]);
    this.container.setDepth(6);
  }

  syncFromServer(state: EntityState) {
    this.ghost.x = state.x;
    this.ghost.y = state.y;
    this.ghost.vx = state.vx;
    this.ghost.vy = state.vy;

    const color = parseColor(state.color);
    if (color !== this.fillColor) {
      this.fillColor = color;
      this.body.setFillStyle(color);
    }
  }

  update(dt: number, ctx: PredictionContext) {
    applyFriction(this.ghost, this.config.friction, dt);
    integrateCircle(this.ghost, dt, ctx.solids, this.config.restitution);

    applyFriction(this.predicted, this.config.friction, dt);
    if (ctx.sweep && this.config.pushTransfer > 0) {
      applySweepPush(this.predicted, ctx.sweep, PLAYER_RADIUS, this.config.pushTransfer);
    }
    clampSpeed(this.predicted, this.config.maxSpeed);
    integrateCircle(this.predicted, dt, ctx.solids, this.config.restitution);

    const errorX = this.ghost.x - this.predicted.x;
    const errorY = this.ghost.y - this.predicted.y;
    if (Math.hypot(errorX, errorY) > SNAP_DISTANCE) {
      this.predicted = { ...this.ghost };
    } else {
      const alpha = 1 - Math.exp(-CORRECTION_RATE * dt);
      this.predicted.x += errorX * alpha;
      this.predicted.y += errorY * alpha;
      this.predicted.vx += (this.ghost.vx - this.predicted.vx) * alpha;
      this.predicted.vy += (this.ghost.vy - this.predicted.vy) * alpha;
    }

    this.container.setPosition(this.predicted.x, this.predicted.y);
    this.container.rotation +=
      ((this.predicted.vx + this.predicted.vy) * dt) / (this.radius * 2);
  }

  destroy() {
    this.container.destroy();
  }
}
