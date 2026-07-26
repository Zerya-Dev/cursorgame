import { MapSchema, Schema, type } from "@colyseus/schema";
import {
  ButtonState,
  Door,
  InteractivePropState,
  Player,
  PressurePlate,
} from "./GeneralSchemas.js";

export class Entity extends Schema {
  @type("string") id = "";
  @type("string") kind = "";
  /**
   * Position and velocity are quantised to whole units on the wire. Clients run the
   * shared physics locally and only ease toward these values, so sub-pixel precision
   * would be discarded anyway. See `BallView`.
   */
  @type("int16") x = 0;
  @type("int16") y = 0;
  @type("int16") vx = 0;
  @type("int16") vy = 0;
  @type("uint16") radius = 20;
  @type("string") color = "#e0e0e0";
}

export class MainRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Door }) doors = new MapSchema<Door>();
  @type({ map: PressurePlate }) plates = new MapSchema<PressurePlate>();
  @type({ map: Entity }) entities = new MapSchema<Entity>();
  @type({ map: InteractivePropState }) interactiveProps = new MapSchema<InteractivePropState>();
  @type(ButtonState) button = new ButtonState();
}
