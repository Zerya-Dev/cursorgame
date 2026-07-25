import {ArraySchema, MapSchema, Schema, type} from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name: string;
  @type("number") x: number;
  @type("number") y: number;
}

export class Door extends Schema {
  @type("string") name: string;
  @type("number") y: number;
  @type("number") x: number;
  @type("number") yButton: number;
  @type("number") xButton: number;
  @type("boolean") open: boolean;
}

export class MainRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ array: Door }) doors = new ArraySchema<Door>();
}
