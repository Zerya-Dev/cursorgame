import { WORLD_HEIGHT, WORLD_WIDTH } from "./config";

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A door that blocks movement until its linked pressure plate is pressed. */
export interface Door extends Obstacle {
  id: string;
}

/** Floor area that keeps its `doorIds` doors open while an occupant stands on it. */
export interface PressurePlate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  doorIds: string[];
}

export interface ColorStation extends Obstacle {
  color: string;
  label: string;
}

const T = 40; // default wall thickness

export const OBSTACLES: Obstacle[] = [
  // Outer walls
  { x: 0, y: 0, width: WORLD_WIDTH, height: T },
  { x: 0, y: WORLD_HEIGHT - T, width: WORLD_WIDTH, height: T },
  { x: 0, y: 0, width: T, height: WORLD_HEIGHT },
  { x: WORLD_WIDTH - T, y: 0, width: T, height: WORLD_HEIGHT },

  // Top-left room wall with a doorway gap
  { x: 520, y: 300, width: T, height: 380 },
  { x: 520, y: 820, width: T, height: 300 },
  { x: 520, y: 300, width: 520, height: T },

  // Central block
  { x: 1280, y: 760, width: 520, height: 360 },

  // Scattered pillars
  { x: 900, y: 1500, width: 160, height: 160 },
  { x: 2050, y: 430, width: 220, height: 90 },
  { x: 2380, y: 1250, width: 90, height: 520 },
  { x: 1650, y: 1780, width: 340, height: 120 },

  // Bottom-right chamber walls with an opening
  { x: 2500, y: 1500, width: T, height: 260 },
  { x: 2500, y: 1900, width: T, height: 340 },
  { x: 2500, y: 2200, width: 560, height: T },
];

export const DOORS: Door[] = [
  { id: "door-room", x: 520, y: 680, width: T, height: 140 },
  { id: "door-chamber", x: 2500, y: 1760, width: T, height: 140 },
];

export const PLATES: PressurePlate[] = [
  { id: "plate-room", x: 760, y: 900, width: 110, height: 110, doorIds: ["door-room"] },
  { id: "plate-chamber", x: 1980, y: 1360, width: 110, height: 110, doorIds: ["door-chamber"] },
];

export const COLOR_STATIONS: ColorStation[] = [
  { color: "#4ade80", label: "GREEN", x: 1380, y: 1190, width: 70, height: 70 },
  { color: "#60a5fa", label: "BLUE", x: 1470, y: 1190, width: 70, height: 70 },
  { color: "#f472b6", label: "PINK", x: 1760, y: 1190, width: 70, height: 70 },
  { color: "#facc15", label: "GOLD", x: 1850, y: 1190, width: 70, height: 70 },
];
