import type { Rect } from "./physics.js";

export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 2400;

export const PLAYER_RADIUS = 12;

export type Obstacle = Rect;

export interface Door extends Rect {
  id: string;
}

export interface PressurePlate extends Rect {
  id: string;
  doorIds: string[];
}

export interface ColorStation extends Rect {
  color: string;
  label: string;
}

export interface LavaZone extends Obstacle {
  teleportTo: { x: number; y: number };
}

const T = 40; // just a constant...
export interface EntityDef {
  kind: string;
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface EntityKindConfig {
  friction: number;
  restitution: number;
  maxSpeed: number;
  pushTransfer: number;
  colorable: boolean;
  pressesPlates: boolean;
}

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

export const DOOR_RECTS: Record<string, Rect> = Object.fromEntries(
  DOORS.map((door) => [door.id, door]),
);
export const DOOR_IDS = DOORS.map((door) => door.id);

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

export const LAVA_ZONES: LavaZone[] = [
  {
    x: 1600,
    y: 1450,
    width: 150,
    height: 100,
    teleportTo: { x: 1650, y: 1250 },
  },
];

export const ENTITY_KINDS: Record<string, EntityKindConfig> = {
  ball: {
    friction: 2.2,
    restitution: 0.45,
    maxSpeed: 1100,
    pushTransfer: 1.2,
    colorable: true,
    pressesPlates: true,
  },
  boulder: {
    friction: 6,
    restitution: 0.15,
    maxSpeed: 400,
    pushTransfer: 0.5,
    colorable: false,
    pressesPlates: true,
  },
};

export const ENTITIES: EntityDef[] = [
  { kind: "ball", id: "ball-main", x: 1600, y: 1450, radius: 20, color: "#e0e0e0" },
  { kind: "ball", id: "ball-small", x: 1150, y: 1950, radius: 14, color: "#f97316" },
  { kind: "boulder", id: "boulder-1", x: 2200, y: 950, radius: 30, color: "#8b8b9e" },
];
