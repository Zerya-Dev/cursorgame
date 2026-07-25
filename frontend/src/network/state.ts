import type { MapSchema } from "@colyseus/schema";

export interface Player {
  name: string;
  color: string;
  x: number;
  y: number;
}

export interface DoorState {
  id: string;
  open: boolean;
}

export interface PressurePlateState {
  id: string;
  active: boolean;
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

export interface RoomState {
  players: MapSchema<Player>;
  doors: MapSchema<DoorState>;
  plates: MapSchema<PressurePlateState>;
  entities: MapSchema<EntityState>;
}
