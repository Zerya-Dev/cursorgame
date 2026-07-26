import type { MapSchema } from "@colyseus/schema";

export interface Player {
  name: string;
  color: string;
  x: number;
  y: number;
  angle: number;
  charged: boolean;
}

export interface DoorState {
  id: string;
  open: boolean;
}

export interface PressurePlateState {
  id: string;
  active: boolean;
}

export interface ButtonState {
  stage: number;
  clicks: number;
  target: number;
}

export interface EntityState {
  id: string;
  kind: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export interface InteractivePropState {
  id: string;
  status: number;
}

export interface RoomState {
  players: MapSchema<Player>;
  doors: MapSchema<DoorState>;
  plates: MapSchema<PressurePlateState>;
  entities: MapSchema<EntityState>;
  interactiveProps: MapSchema<InteractivePropState>;
  button: ButtonState;
}
