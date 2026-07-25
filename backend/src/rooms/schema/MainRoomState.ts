import { MapSchema, Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name = "";
  @type("string") color = "#4ade80";
  @type("number") x = 1600;
  @type("number") y = 1200;
}

export class Door extends Schema {
  @type("string") id = "";
  @type("boolean") open = false;
}

export class PressurePlate extends Schema {
  @type("string") id = "";
  @type("boolean") active = false;
}

export class MainRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Door }) doors = new MapSchema<Door>();
  @type({ map: PressurePlate }) plates = new MapSchema<PressurePlate>();
}
