import { PLAYER_RADIUS, applySweepPush } from "@shared";
import { Body } from "./Body.js";
import type { ServerEntity, Trait } from "../Entity.js";
import type { World } from "../../World.js";

export class PlayerPushable implements Trait {
  constructor(private transfer: number) {}

  interact(entity: ServerEntity, world: World) {
    const bodyTrait = entity.get(Body);
    if (!bodyTrait) return;

    const body = bodyTrait.asCircleBody(entity);
    for (const sweep of world.playerSweeps) {
      applySweepPush(body, sweep, PLAYER_RADIUS, this.transfer);
    }
    bodyTrait.applyCircleBody(entity, body);
  }
}
