import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name = "";
  @type("string") color = "#4ade80";
  /** World coordinates, rounded to whole pixels so they fit int16 (x 0..2000, y -600..10770). */
  @type("int16") x = 1600;
  @type("int16") y = 1200;
  /** Facing angle in radians, fixed-point via {@link ANGLE_SCALE}. */
  @type("int16") angle = 0;
  @type("boolean") charged = false;
  /** False while the player is dropped but still inside the reconnection grace period. */
  @type("boolean") connected = true;
}

export class Door extends Schema {
  @type("string") id = "";
  @type("boolean") open = false;
}

export class PressurePlate extends Schema {
  @type("string") id = "";
  @type("boolean") active = false;
}

export class ButtonState extends Schema {
  /** 0 = idle ("do not press"), 1 = armed ("really?", clicks now count), 2 = triggered */
  @type("uint8") stage = 0;
  @type("number") clicks = 0;
  @type("number") target = 0;
}

export class InteractivePropState extends Schema {
  @type("string") id = "";
  /** 0 = closed, 1 = open and inactive */
  @type("uint8") status = 0;
}
