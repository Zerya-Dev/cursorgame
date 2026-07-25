import { MapSchema, Schema, type } from "@colyseus/schema";
import {Door, Player, PressurePlate} from "./GeneralSchemas.js";

export class MainRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Door }) doors = new MapSchema<Door>();
  @type({ map: PressurePlate }) plates = new MapSchema<PressurePlate>();
}
