import { MapSchema, Schema, type } from "@colyseus/schema";
import { ButtonState, Door, Player, PressurePlate } from "./GeneralSchemas.js";

export class Entity extends Schema {
  @type("string") id = "";
  @type("string") kind = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") vx = 0;
  @type("number") vy = 0;
  @type("number") radius = 20;
  @type("string") color = "#e0e0e0";
}

export class MainRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Door }) doors = new MapSchema<Door>();
  @type({ map: PressurePlate }) plates = new MapSchema<PressurePlate>();
  @type({ map: Entity }) entities = new MapSchema<Entity>();
  @type(ButtonState) button = new ButtonState();
}
