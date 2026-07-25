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
  /** once opened, stays open forever instead of re-locking when plates release */
  permanent?: boolean;
}

export interface PlateFilter {
  /** "player" restricts to players; an ENTITY_KINDS key (e.g. "ball") restricts to that kind; omitted = any presser */
  entityKind?: string;
  /** occupant's color must match (case-insensitive) */
  color?: string;
}

export type PlateCountRule =
  | { mode: "atLeast"; value: number }
  | { mode: "exact"; value: number }
  | { mode: "even" }
  | { mode: "allPlayers" }
  | { mode: "balance"; withPlateId: string; maxDifference?: number };

export interface PressurePlate extends Rect {
  id: string;
  doorIds: string[];
  /** what counts as an occupant; omitted = any presser */
  filter?: PlateFilter;
  /** requirement on the number of matching occupants; omitted = at least 1 */
  count?: PlateCountRule;
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

const LOBBY_TOP = CORRIDOR_HEIGHT;
const CORRIDOR_LEFT = (WORLD_WIDTH - CORRIDOR_WIDTH) / 2;
const CORRIDOR_RIGHT = CORRIDOR_LEFT + CORRIDOR_WIDTH;

const ROOM_HEIGHT = 500;
const ROOM_BOTTOM = T + ROOM_HEIGHT;

const LEVEL1_DOOR_Y = 900;
const LEVEL1_TOP = LEVEL1_DOOR_Y + 30;
const LEVEL1_BOTTOM = 1630;
const LEVEL1_LEFT = 300;
const LEVEL1_RIGHT = 1300;

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
  { x: 0, y: 0, width: WORLD_WIDTH, height: T },
  { x: 0, y: WORLD_HEIGHT - T, width: WORLD_WIDTH, height: T },
  { x: 0, y: 0, width: T, height: WORLD_HEIGHT },
  { x: WORLD_WIDTH - T, y: 0, width: T, height: WORLD_HEIGHT },

  { x: T, y: ROOM_BOTTOM, width: CORRIDOR_LEFT - T, height: LEVEL1_TOP - ROOM_BOTTOM },
  {
    x: CORRIDOR_RIGHT,
    y: ROOM_BOTTOM,
    width: WORLD_WIDTH - T - CORRIDOR_RIGHT,
    height: LEVEL1_TOP - ROOM_BOTTOM,
  },

  { x: T, y: LEVEL1_TOP, width: LEVEL1_LEFT - T, height: LEVEL1_BOTTOM - LEVEL1_TOP },
  {
    x: LEVEL1_RIGHT,
    y: LEVEL1_TOP,
    width: WORLD_WIDTH - T - LEVEL1_RIGHT,
    height: LEVEL1_BOTTOM - LEVEL1_TOP,
  },

  { x: T, y: LEVEL1_BOTTOM, width: CORRIDOR_LEFT - T, height: LOBBY_TOP - LEVEL1_BOTTOM },
  {
    x: CORRIDOR_RIGHT,
    y: LEVEL1_BOTTOM,
    width: WORLD_WIDTH - T - CORRIDOR_RIGHT,
    height: LOBBY_TOP - LEVEL1_BOTTOM,
  },

  { x: 40, y: 2000, width: 200, height: LOBBY_TOP - T },
  { x: 1400, y: 2000, width: 200, height: LOBBY_TOP - T },
];

export const DOORS: Door[] = [
  { x: 680, y: 1970, width: 320, height: 30, id: "0" },
  { x: CORRIDOR_LEFT, y: LEVEL1_DOOR_Y, width: CORRIDOR_WIDTH, height: 30, id: "1", permanent: true },
];

export const PLATES: PressurePlate[] = [
  {
    id: "plate-lobby-left-1",
    x: 350,
    y: 2100,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "exact", value: 1 },
  },
  {
    id: "plate-lobby-left-2",
    x: 350,
    y: 2280,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "exact", value: 1 },
  },
  {
    id: "plate-lobby-left-3",
    x: 350,
    y: 2460,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "exact", value: 1 },
  },
  {
    id: "plate-lobby-left-4",
    x: 350,
    y: 2640,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "exact", value: 1 },
  },
  {
    id: "plate-lobby-left-5",
    x: 350,
    y: 2820,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "exact", value: 1 },
  },
  {
    id: "plate-lobby-right-1",
    x: 1150,
    y: 2100,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "exact", value: 1 },
  },
  {
    id: "plate-lobby-right-2",
    x: 1150,
    y: 2280,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "exact", value: 1 },
  },
  {
    id: "plate-lobby-right-3",
    x: 1150,
    y: 2460,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "exact", value: 1 },
  },
  {
    id: "plate-lobby-right-4",
    x: 1150,
    y: 2640,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "exact", value: 1 },
  },
  {
    id: "plate-lobby-right-5",
    x: 1150,
    y: 2820,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "exact", value: 1 },
  },

  {
    id: "plate-level1-left",
    x: 380,
    y: LEVEL1_TOP + 200,
    width: 300,
    height: 300,
    doorIds: ["1"],
    filter: { entityKind: "player" },
    count: { mode: "balance", withPlateId: "plate-level1-right" },
  },
  {
    id: "plate-level1-right",
    x: 920,
    y: LEVEL1_TOP + 200,
    width: 300,
    height: 300,
    doorIds: ["1"],
    filter: { entityKind: "player" },
    count: { mode: "balance", withPlateId: "plate-level1-left" },
  },
];

export const DOOR_RECTS: Record<string, Rect> = Object.fromEntries(
  DOORS.map((door) => [door.id, door]),
);
export const DOOR_IDS = DOORS.map((door) => door.id);

export const COLOR_STATIONS: ColorStation[] = [
  { color: "#ff0000", label: "RED", x: 630, y: 2300, width: 70, height: 70 },
  { color: "#00f84f", label: "GREEN", x: 720, y: 2300, width: 70, height: 70 },
  { color: "#0014ed", label: "BLUE", x: 810, y: 2300, width: 70, height: 70 },
  { color: "#000000", label: "BLACK", x: 900, y: 2300, width: 70, height: 70 },
];

export const LAVA_ZONES: LavaZone[] = [];

export const WORLD_TEXTS: WorldText[] = [
  { x: 552, y: 2100, text: "Hellllo there!", size: 45 },
  { x: 806, y: 2178, text: "Pick a color!", size: 30 },
  { x: 548, y: LEVEL1_TOP + 40, text: "Split evenly - half left, half right", size: 28 },
];

export interface ButtonDef extends Rect {}

// centered in the room at the top of the corridor, past door "0" and the plate puzzle
export const BUTTON: ButtonDef = {
  x: WORLD_WIDTH / 2 - 110,
  y: T + ROOM_HEIGHT / 2 - 70,
  width: 220,
  height: 140,
};

// spec calls for 1000 combined clicks; using 20 for now per request while testing
export const BUTTON_CLICK_TARGET = 20;

export const BALL_SPAWN_COLORS = ["#ef4444", "#f97316", "#facc15", "#4ade80", "#60a5fa", "#a78bfa"];

export const BALL_SPAWN_COUNT = 30;

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
