import type { Rect } from "./physics.js";

export const WORLD_WIDTH = 1600;
export const LOBBY_HEIGHT = 1000;
export const CORRIDOR_WIDTH = 320;
export const CORRIDOR_HEIGHT = 2000;
export const WORLD_HEIGHT = LOBBY_HEIGHT + CORRIDOR_HEIGHT;

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

export interface WorldText {
  x: number;
  y: number;
  text: string;
  size: number;
}

const T = 40; // wall thickness

// Where the corridor (above) narrows down into the lobby (below).
const LOBBY_TOP = CORRIDOR_HEIGHT;
const CORRIDOR_LEFT = (WORLD_WIDTH - CORRIDOR_WIDTH) / 2;
const CORRIDOR_RIGHT = CORRIDOR_LEFT + CORRIDOR_WIDTH;

export const SPAWN_POINT = { x: WORLD_WIDTH / 2, y: LOBBY_TOP + LOBBY_HEIGHT / 2 };

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

  // Corridor funnel: narrows the lobby below into the corridor above.
  { x: T, y: T, width: CORRIDOR_LEFT - T, height: LOBBY_TOP - T },
  { x: CORRIDOR_RIGHT, y: T, width: WORLD_WIDTH - T - CORRIDOR_RIGHT, height: LOBBY_TOP - T },

  { x: 40, y: 2000, width: 200, height: LOBBY_TOP - T },
  { x: 1400, y: 2000, width: 200, height: LOBBY_TOP - T },
];

export const DOORS: Door[] = [
	{x: 640, y: 1970, width: 320, height: 30, id: '0'}
];

// 10 lobby plates, 5 per side. Not linked to any door yet.
export const PLATES: PressurePlate[] = [
  { id: "plate-lobby-left-1", x: 350, y: 2100, width: 100, height: 100, doorIds: [] },
  { id: "plate-lobby-left-2", x: 350, y: 2280, width: 100, height: 100, doorIds: [] },
  { id: "plate-lobby-left-3", x: 350, y: 2460, width: 100, height: 100, doorIds: [] },
  { id: "plate-lobby-left-4", x: 350, y: 2640, width: 100, height: 100, doorIds: [] },
  { id: "plate-lobby-left-5", x: 350, y: 2820, width: 100, height: 100, doorIds: [] },
  { id: "plate-lobby-right-1", x: 1150, y: 2100, width: 100, height: 100, doorIds: [] },
  { id: "plate-lobby-right-2", x: 1150, y: 2280, width: 100, height: 100, doorIds: [] },
  { id: "plate-lobby-right-3", x: 1150, y: 2460, width: 100, height: 100, doorIds: [] },
  { id: "plate-lobby-right-4", x: 1150, y: 2640, width: 100, height: 100, doorIds: [] },
  { id: "plate-lobby-right-5", x: 1150, y: 2820, width: 100, height: 100, doorIds: [] },
];

export const DOOR_RECTS: Record<string, Rect> = Object.fromEntries(
  DOORS.map((door) => [door.id, door]),
);
export const DOOR_IDS = DOORS.map((door) => door.id);

export const COLOR_STATIONS: ColorStation[] = [
  // { color: "#4ade80", label: "GREEN", x: 600, y: 2300, width: 70, height: 70 },
  // { color: "#60a5fa", label: "BLUE", x: 690, y: 2300, width: 70, height: 70 },
  // { color: "#f472b6", label: "PINK", x: 840, y: 2300, width: 70, height: 70 },
  // { color: "#facc15", label: "GOLD", x: 930, y: 2300, width: 70, height: 70 },
  { color: "#ff0000", label: "RED", x: 630, y: 2300, width: 70, height: 70 },
  { color: "#00f84f", label: "GREEN", x: 720, y: 2300, width: 70, height: 70 },
  { color: "#0014ed", label: "BLUE", x: 810, y: 2300, width: 70, height: 70 },
  { color: "#000000", label: "BLACK", x: 900, y: 2300, width: 70, height: 70 },
];

export const LAVA_ZONES: LavaZone[] = [];

export const WORLD_TEXTS: WorldText[] = [
  { x: 552, y: 2100, text: "Hellllo there!", size: 45 },
  { x: 806, y: 2178, text: "Pick a color!", size: 30 },
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
  // boulder: {
  //   friction: 6,
  //   restitution: 0.15,
  //   maxSpeed: 400,
  //   pushTransfer: 0.5,
  //   colorable: false,
  //   pressesPlates: true,
  // },
};

export const ENTITIES: EntityDef[] = [
  { kind: "ball", id: "ball-main", x: 639, y: 2200, radius: 20, color: "#e0e0e0" },
  // { kind: "ball", id: "ball-small", x: 500, y: 2700, radius: 14, color: "#f97316" },
  // { kind: "boulder", id: "boulder-1", x: 1100, y: 2700, radius: 30, color: "#8b8b9e" },
];
