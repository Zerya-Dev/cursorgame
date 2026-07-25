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

export interface RoomState {
  players: MapSchema<Player>;
  doors: MapSchema<DoorState>;
  plates: MapSchema<PressurePlateState>;
}
