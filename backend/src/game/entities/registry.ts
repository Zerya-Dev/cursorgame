import { ENTITY_KINDS } from "@shared";
import { Entity } from "../../rooms/schema/MainRoomState.js";
import { ServerEntity } from "./Entity.js";
import { Body } from "./traits/Body.js";
import { Colorable } from "./traits/Colorable.js";
import { PlatePresser } from "./traits/PlatePresser.js";
import { PlayerPushable } from "./traits/PlayerPushable.js";
import type { EntityDef } from "@shared";

export function createEntity(def: EntityDef): ServerEntity {
  const config = ENTITY_KINDS[def.kind];
  if (!config) throw new Error(`Unknown entity kind: ${def.kind}`);

  const schema = new Entity();
  schema.id = def.id;
  schema.kind = def.kind;
  schema.x = def.x;
  schema.y = def.y;
  schema.radius = def.radius;
  schema.color = def.color;

  const entity = new ServerEntity(schema);
  entity.add(
    new Body({
      friction: config.friction,
      restitution: config.restitution,
      maxSpeed: config.maxSpeed,
    }),
  );
  if (config.pushTransfer > 0) entity.add(new PlayerPushable(config.pushTransfer));
  if (config.colorable) entity.add(new Colorable());
  if (config.pressesPlates) entity.add(new PlatePresser());
  return entity;
}
