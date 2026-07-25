import { applyFriction, clampSpeed, integrateCircle } from "@shared";
import type { CircleBody } from "@shared";
import type { ServerEntity, Trait } from "../Entity.js";
import type { World } from "../../World.js";

export interface BodyOptions {
  friction: number;
  restitution: number;
  maxSpeed: number;
}

export class Body implements Trait {
  vx = 0;
  vy = 0;

  constructor(readonly options: BodyOptions) {}

  asCircleBody(entity: ServerEntity): CircleBody {
    return {
      x: entity.schema.x,
      y: entity.schema.y,
      vx: this.vx,
      vy: this.vy,
      radius: entity.schema.radius,
    };
  }

  applyCircleBody(entity: ServerEntity, body: CircleBody) {
    entity.schema.x = body.x;
    entity.schema.y = body.y;
    this.vx = body.vx;
    this.vy = body.vy;
  }

  begin(_entity: ServerEntity, _world: World, dt: number) {
    applyFriction(this, this.options.friction, dt);
  }

  move(entity: ServerEntity, world: World, dt: number) {
    const body = this.asCircleBody(entity);
    clampSpeed(body, this.options.maxSpeed);
    integrateCircle(body, dt, world.solids, this.options.restitution);
    this.applyCircleBody(entity, body);
  }

  finish(entity: ServerEntity) {
    entity.schema.vx = this.vx;
    entity.schema.vy = this.vy;
  }
}
