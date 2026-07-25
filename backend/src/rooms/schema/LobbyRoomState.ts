import {ArraySchema, MapSchema, Schema, type} from "@colyseus/schema";
import {Door, Player} from "./GeneralSchemas.js";

export class LobbyRoomState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type({ array: Door }) doors = new ArraySchema<Door>();
}