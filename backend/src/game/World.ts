import {
  DOOR_IDS,
  DOOR_RECTS,
  ENTITIES,
  LAVA_ZONES,
  OBSTACLES,
  circleOverlapsRect,
  collideCircles,
} from "@shared";
import { createEntity } from "./entities/registry.js";
import { Body } from "./entities/traits/Body.js";
import { PlatePresser } from "./entities/traits/PlatePresser.js";
import type { EntityDef, PlateOccupant, Rect, Sweep } from "@shared";
import type { ServerEntity, TraitPhase } from "./entities/Entity.js";
import type { MainRoomState } from "../rooms/schema/MainRoomState.js";

const PAIR_RESTITUTION = 0.8;

export class World {
  playerSweeps: Sweep[] = [];
  solids: Rect[] = [];
  private entities: ServerEntity[] = [];
  private prevPlayerPos = new Map<string, { x: number; y: number }>();

  constructor(private state: MainRoomState) {
    for (const def of ENTITIES) {
      const entity = createEntity(def);
      state.entities.set(def.id, entity.schema);
      this.entities.push(entity);
    }
  }

  spawnEntity(def: EntityDef, velocity?: { vx: number; vy: number }) {
    const entity = createEntity(def);
    if (velocity) {
      const body = entity.get(Body);
      if (body) {
        body.vx = velocity.vx;
        body.vy = velocity.vy;
      }
    }
    this.state.entities.set(def.id, entity.schema);
    this.entities.push(entity);
  }

  occupantsInRect(rect: Rect): PlateOccupant[] {
    const occupants: PlateOccupant[] = [];
    for (const entity of this.entities) {
      if (!entity.has(PlatePresser)) continue;
      const schema = entity.schema;
      if (circleOverlapsRect(schema.x, schema.y, schema.radius, rect)) {
        occupants.push({ entityKind: schema.kind, color: schema.color });
      }
    }
    return occupants;
  }

  collectEntities(rect: Rect, kind: string) {
    this.entities = this.entities.filter((entity) => {
      const schema = entity.schema;
      if (schema.kind !== kind || !circleOverlapsRect(schema.x, schema.y, schema.radius, rect)) {
        return true;
      }
      this.state.entities.delete(schema.id);
      return false;
    });
  }

  forgetPlayer(sessionId: string) {
    this.prevPlayerPos.delete(sessionId);
  }

  update(dt: number) {
    this.collectPlayerSweeps(dt);
    this.collectSolids();
    this.runPhase("begin", dt);
    this.runPhase("interact", dt);
    this.collidePairs();
    this.runPhase("move", dt);
    this.runPhase("finish", dt);
  }

  private runPhase(phase: TraitPhase, dt: number) {
    for (const entity of this.entities) entity.run(phase, this, dt);
  }

  private collectSolids() {
    this.solids = [...OBSTACLES, ...LAVA_ZONES];
    for (const doorId of DOOR_IDS) {
      if (!this.state.doors.get(doorId)?.open) this.solids.push(DOOR_RECTS[doorId]);
    }
  }

  private collectPlayerSweeps(dt: number) {
    this.playerSweeps = [];
    for (const [sessionId, player] of this.state.players) {
      const prev = this.prevPlayerPos.get(sessionId) ?? { x: player.x, y: player.y };
      this.playerSweeps.push({
        fromX: prev.x,
        fromY: prev.y,
        toX: player.x,
        toY: player.y,
        vx: (player.x - prev.x) / dt,
        vy: (player.y - prev.y) / dt,
      });
      this.prevPlayerPos.set(sessionId, { x: player.x, y: player.y });
    }
  }

  private collidePairs() {
    for (let i = 0; i < this.entities.length; i++) {
      const a = this.entities[i];
      const bodyA = a.get(Body);
      if (!bodyA) continue;
      for (let j = i + 1; j < this.entities.length; j++) {
        const b = this.entities[j];
        const bodyB = b.get(Body);
        if (!bodyB) continue;

        const viewA = bodyA.asCircleBody(a);
        const viewB = bodyB.asCircleBody(b);
        collideCircles(viewA, viewB, PAIR_RESTITUTION);
        bodyA.applyCircleBody(a, viewA);
        bodyB.applyCircleBody(b, viewB);
      }
    }
  }
}
