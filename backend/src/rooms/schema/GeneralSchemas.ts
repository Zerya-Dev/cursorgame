import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name = "";
  @type("string") color = "#4ade80";
  @type("number") x = 1600;
  @type("number") y = 1200;
  @type("boolean") charged = false;
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
