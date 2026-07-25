import type { Rect } from "./physics.js";

export const WORLD_WIDTH = 2000;
export const LOBBY_HEIGHT = 1800;
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
  label?: string;
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
  /** degrees of tilt, so floor signs don't read as typeset; defaults to a slight lean */
  rotation?: number;
}

const T = 40; // wall thickness

// Where the corridor (above) narrows down into the lobby (below).
const LOBBY_TOP = CORRIDOR_HEIGHT;
const CORRIDOR_LEFT = (WORLD_WIDTH - CORRIDOR_WIDTH) / 2;
const CORRIDOR_RIGHT = CORRIDOR_LEFT + CORRIDOR_WIDTH;

// Vertical layout down the corridor, top to bottom: a landing behind door "2"
// (the goal), the button/trash room, Level 1's balance-plate room, then the
// funnel down into the lobby. Every one of these sits *above* LOBBY_TOP, so
// the lobby itself (and everything in it) keeps its original coordinates.
const LANDING_BEYOND_DOOR2 = 150; // clearance above door "2", where the cheese sits
const DOOR2_Y = T + LANDING_BEYOND_DOOR2;
const STUB_DOOR2_TO_ROOM = 110;

const ROOM_HEIGHT = 500;
const ROOM_TOP = DOOR2_Y + 30 + STUB_DOOR2_TO_ROOM;
const ROOM_BOTTOM = ROOM_TOP + ROOM_HEIGHT;

const STUB_ROOM_TO_LEVEL1 = 150;
const LEVEL1_DOOR_Y = ROOM_BOTTOM + STUB_ROOM_TO_LEVEL1;
const LEVEL1_TOP = LEVEL1_DOOR_Y + 30;
const LEVEL1_HEIGHT = 500;
const LEVEL1_BOTTOM = LEVEL1_TOP + LEVEL1_HEIGHT;
const LEVEL1_LEFT = 500;
const LEVEL1_RIGHT = 1500;

// The lobby floor, bottom wall inner edge.
const LOBBY_BOTTOM = WORLD_HEIGHT - T;

// The lobby is split into three rooms side-by-side: a colour room (west), the
// main hall (centre, under the corridor exit), and a practice room (east).
// Both dividing walls are vertical, each with a single gap partway down.
const HALL_LEFT_WALL_X = 500; // colour room | main hall
const HALL_RIGHT_WALL_X = 1500; // main hall | practice room
const ROOM_GAP_TOP = 2500;
const ROOM_GAP_HEIGHT = 200;
const ROOM_GAP_BOTTOM = ROOM_GAP_TOP + ROOM_GAP_HEIGHT;

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

  // Landing beyond door "2" -- the cheese's clearing.
  { x: T, y: T, width: CORRIDOR_LEFT - T, height: DOOR2_Y - T },
  { x: CORRIDOR_RIGHT, y: T, width: WORLD_WIDTH - T - CORRIDOR_RIGHT, height: DOOR2_Y - T },

  // Corridor stub between door "2" and the button/trash room.
  { x: T, y: DOOR2_Y + 30, width: CORRIDOR_LEFT - T, height: ROOM_TOP - (DOOR2_Y + 30) },
  {
    x: CORRIDOR_RIGHT,
    y: DOOR2_Y + 30,
    width: WORLD_WIDTH - T - CORRIDOR_RIGHT,
    height: ROOM_TOP - (DOOR2_Y + 30),
  },

  // Button/trash room is full-width, carved out by starting the next funnel
  // run below it instead of right after the stub above.

  // Funnel from the button/trash room down to Level 1's door.
  { x: T, y: ROOM_BOTTOM, width: CORRIDOR_LEFT - T, height: LEVEL1_TOP - ROOM_BOTTOM },
  {
    x: CORRIDOR_RIGHT,
    y: ROOM_BOTTOM,
    width: WORLD_WIDTH - T - CORRIDOR_RIGHT,
    height: LEVEL1_TOP - ROOM_BOTTOM,
  },

  // Level 1's room bulges wider than the corridor on both sides.
  { x: T, y: LEVEL1_TOP, width: LEVEL1_LEFT - T, height: LEVEL1_BOTTOM - LEVEL1_TOP },
  {
    x: LEVEL1_RIGHT,
    y: LEVEL1_TOP,
    width: WORLD_WIDTH - T - LEVEL1_RIGHT,
    height: LEVEL1_BOTTOM - LEVEL1_TOP,
  },

  // Corridor funnel: narrows Level 1's room back down into the corridor,
  // which then widens back out into the lobby below.
  { x: T, y: LEVEL1_BOTTOM, width: CORRIDOR_LEFT - T, height: LOBBY_TOP - LEVEL1_BOTTOM },
  {
    x: CORRIDOR_RIGHT,
    y: LEVEL1_BOTTOM,
    width: WORLD_WIDTH - T - CORRIDOR_RIGHT,
    height: LOBBY_TOP - LEVEL1_BOTTOM,
  },

  // Colour room | main hall divider. Open gap (no door) -- you just walk in.
  { x: HALL_LEFT_WALL_X, y: LOBBY_TOP, width: T, height: ROOM_GAP_TOP - LOBBY_TOP },
  { x: HALL_LEFT_WALL_X, y: ROOM_GAP_BOTTOM, width: T, height: LOBBY_BOTTOM - ROOM_GAP_BOTTOM },

  // Main hall | practice room divider. Gap is filled by door "practice" below.
  { x: HALL_RIGHT_WALL_X, y: LOBBY_TOP, width: T, height: ROOM_GAP_TOP - LOBBY_TOP },
  { x: HALL_RIGHT_WALL_X, y: ROOM_GAP_BOTTOM, width: T, height: LOBBY_BOTTOM - ROOM_GAP_BOTTOM },
];

export const DOORS: Door[] = [
  // Guards the cheese landing at the very top; the trash plate below opens it.
  { x: CORRIDOR_LEFT, y: DOOR2_Y, width: CORRIDOR_WIDTH, height: 30, id: "2", permanent: true },
  // Guards Level 1's exit; the balance plates open it.
  {
    x: CORRIDOR_LEFT,
    y: LEVEL1_DOOR_Y,
    width: CORRIDOR_WIDTH,
    height: 30,
    id: "1",
    permanent: true,
  },
  // Sits exactly in the corridor funnel's gap (x = CORRIDOR_LEFT, width = CORRIDOR_WIDTH) so it
  // fully covers the opening -- previously this was offset from the funnel and left a sliver of
  // the "closed" gap always walkable.
  { x: CORRIDOR_LEFT, y: LOBBY_TOP - 30, width: CORRIDOR_WIDTH, height: 30, id: "0" },
  // Practice room door: opened by the two practice plates, then stays open forever (permanent)
  // so the room is free to wander back into once you've learned the mechanic.
  {
    x: HALL_RIGHT_WALL_X,
    y: ROOM_GAP_TOP,
    width: T,
    height: ROOM_GAP_HEIGHT,
    id: "practice",
    permanent: true,
  },
];

export const PLATES: PressurePlate[] = [
  // Feed balls in here to open door "2" and reach the cheese.
  {
    id: "plate-trash",
    x: 120,
    y: ROOM_TOP + 100,
    width: 280,
    height: 300,
    doorIds: [],
    filter: { entityKind: "ball" },
    label: "trash",
  },

  // Level 1: stand evenly split across both plates to open door "1".
  {
    id: "plate-level1-left",
    x: LEVEL1_LEFT + 80,
    y: LEVEL1_TOP + 100,
    width: 300,
    height: 300,
    doorIds: ["1"],
    filter: { entityKind: "player" },
    count: { mode: "balance", withPlateId: "plate-level1-right" },
  },
  {
    id: "plate-level1-right",
    x: LEVEL1_RIGHT - 80 - 300,
    y: LEVEL1_TOP + 100,
    width: 300,
    height: 300,
    doorIds: ["1"],
    filter: { entityKind: "player" },
    count: { mode: "balance", withPlateId: "plate-level1-left" },
  },

  // The real gate: 3 plates near the top of the main hall, all needed at once (each exact 1
  // player) to open door "0" into the corridor. Down from the old 10-plate wall.
  {
    id: "plate-gate-1",
    x: 805,
    y: 2150,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "exact", value: 1 },
  },
  {
    id: "plate-gate-2",
    x: 955,
    y: 2150,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "exact", value: 1 },
  },
  {
    id: "plate-gate-3",
    x: 1105,
    y: 2150,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "exact", value: 1 },
  },

  // Practice plates: a miniature of the real gate (2 plates instead of 3, no stakes) that
  // opens the permanent door into the practice room, sitting just outside it.
  {
    id: "plate-practice-1",
    x: 1370,
    y: 2350,
    width: 100,
    height: 100,
    doorIds: ["practice"],
    // no filter: a barrel shoved onto it counts just as much as a mouse, so one
    // player can still open the practice room on their own
    count: { mode: "atLeast", value: 1 },
  },
  {
    id: "plate-practice-2",
    x: 1370,
    y: 2600,
    width: 100,
    height: 100,
    doorIds: ["practice"],
    // no filter: a barrel shoved onto it counts just as much as a mouse, so one
    // player can still open the practice room on their own
    count: { mode: "atLeast", value: 1 },
  },
];

export const TRASH_PLATE_ID = "plate-trash";
export const TRASH_DOOR_ID = "2";

export const DOOR_RECTS: Record<string, Rect> = Object.fromEntries(
  DOORS.map((door) => [door.id, door]),
);
export const DOOR_IDS = DOORS.map((door) => door.id);

// Moved off the open floor into their own room (west of the main hall).
// Softer, hand-inked tones instead of screen-saturated primaries -- still
// read unambiguously as red/green/blue, but sit on the paper instead of
// fighting it. No black option -- it just vanished into the ink linework.
export const COLOR_STATIONS: ColorStation[] = [
  { color: "#c4553f", label: "RED", x: 150, y: 2300, width: 70, height: 70 },
  { color: "#5bbf6a", label: "GREEN", x: 240, y: 2300, width: 70, height: 70 },
  { color: "#5b8fd9", label: "BLUE", x: 330, y: 2300, width: 70, height: 70 },
];

export const LAVA_ZONES: LavaZone[] = [];

export interface Slide {
  id: string;
  /** the mouth: step into this and the ride grabs you */
  entry: Rect;
  /** waypoints from mouth to exit, in order — the ride follows these */
  path: Array<{ x: number; y: number }>;
  /** world px per second along the chute; omitted uses the client default */
  speed?: number;
}

/**
 * A chute. Step into the mouth and control is taken away while you are carried
 * along the path, which tunnels straight through walls between rooms. The ride
 * is deliberately NOT collision-checked, so the path here is the authority --
 * the last waypoint is where you are set down.
 */
export const SLIDES: Slide[] = [
  // Runs left-to-right across the bottom of the lobby, tunnelling under both
  // dividing walls: colour room -> main hall -> practice room.
  {
    id: "slide-colour-to-practice",
    entry: { x: 110, y: 3360, width: 170, height: 170 },
    path: [
      { x: 195, y: 3445 },
      { x: 400, y: 3560 },
      { x: 900, y: 3620 },
      { x: 1400, y: 3560 },
      { x: 1770, y: 3430 },
    ],
    speed: 850,
  },
];

/**
 * The game's voice. Written on the dungeon floor rather than in a HUD, so it
 * reads as part of the world. Coordinates are centres.
 */
export const WORLD_TEXTS: WorldText[] = [
  {
    x: 260,
    y: ROOM_TOP + 40,
    text: "toss balls in here to earn the cheese",
    size: 20,
    rotation: -2,
  },
  {
    x: 1000,
    y: LEVEL1_TOP + 40,
    text: "split evenly - half left, half right",
    size: 24,
    rotation: 1,
  },
  { x: 1000, y: 2070, text: "the cheese is a lie.", size: 48, rotation: -2 },
  { x: 292, y: 3300, text: "look! a droga szybkiego ruchu!", size: 24, rotation: 2 },
  { x: 270, y: 2200, text: "pick a colour", size: 28, rotation: -3 },
  { x: 1270, y: 2470, text: "try the pressure plates here. nothing bad happens.", size: 22, rotation: 1 },
  { x: 1750, y: 2150, text: "no cheese in here :((", size: 24, rotation: -2 },
  { x: 1000, y: 2960, text: "you - are - a - mouse", size: 22, rotation: 2 },
  { x: 1000, y: 3050, text: "try to push this around while you wait for others v", size: 20, rotation: -1 },
];

export interface DecorDef {
  /** texture key preloaded in BootScene */
  sprite: string;
  x: number;
  y: number;
  size?: number;
  /** degrees */
  rotation?: number;
}

/** Purely cosmetic props. Never collide -- they are not part of OBSTACLES. */
export const DECORATIONS: DecorDef[] = [
  // Main hall, west pocket (between the colour-room wall and the gate/practice plates).
  { sprite: "crate", x: 650, y: 2350, size: 70, rotation: 4 },
  { sprite: "barrels", x: 680, y: 2450, size: 85, rotation: -6 },
  { sprite: "plants", x: 650, y: 2650, size: 65, rotation: -5 },

  // Main hall, east pocket (between the gate plates and the practice plates).
  { sprite: "crate_small", x: 1250, y: 2350, size: 55, rotation: -9 },
  { sprite: "plants", x: 1260, y: 2500, size: 62, rotation: 8 },

  // Main hall, lower-left.
  { sprite: "table", x: 680, y: 3300, size: 100, rotation: -2 },
  { sprite: "chair", x: 680, y: 3400, size: 60, rotation: 7 },
  { sprite: "chest", x: 650, y: 3550, size: 75, rotation: -4 },

  // Main hall, lower-right.
  { sprite: "campfire", x: 1300, y: 3300, size: 95, rotation: 0 },
  { sprite: "tree", x: 1250, y: 3500, size: 90, rotation: 0 },
  { sprite: "puddle", x: 1350, y: 3600, size: 110, rotation: 0 },

  // Colour room.
  { sprite: "plants", x: 80, y: 2150, size: 60, rotation: -5 },
  { sprite: "plants", x: 400, y: 2150, size: 60, rotation: 8 },
  { sprite: "carpet", x: 270, y: 2550, size: 150, rotation: 0 },
  { sprite: "chest", x: 150, y: 2700, size: 75, rotation: -4 },
  { sprite: "table", x: 380, y: 2700, size: 95, rotation: 3 },
  { sprite: "chair", x: 380, y: 2790, size: 55, rotation: 6 },
  { sprite: "tree", x: 250, y: 3000, size: 90, rotation: 0 },
  { sprite: "barrels", x: 120, y: 3200, size: 80, rotation: -6 },
  { sprite: "puddle", x: 400, y: 3200, size: 100, rotation: 0 },
  { sprite: "crate", x: 250, y: 3400, size: 70, rotation: 5 },

  // Practice room.
  { sprite: "carpet", x: 1750, y: 2200, size: 120, rotation: 0 },
  { sprite: "crate", x: 1650, y: 2350, size: 70, rotation: 4 },
  { sprite: "crate_small", x: 1850, y: 2350, size: 55, rotation: -8 },
  { sprite: "barrel", x: 1700, y: 2550, size: 60, rotation: 3 },
  { sprite: "table", x: 1850, y: 2600, size: 95, rotation: -2 },
  { sprite: "chair", x: 1850, y: 2690, size: 55, rotation: 6 },
  { sprite: "plants", x: 1620, y: 2800, size: 65, rotation: -5 },
  { sprite: "campfire", x: 1800, y: 2950, size: 90, rotation: 0 },
  { sprite: "chest", x: 1650, y: 3150, size: 75, rotation: -4 },
  { sprite: "tree", x: 1850, y: 3300, size: 85, rotation: 0 },
  { sprite: "puddle", x: 1700, y: 3450, size: 105, rotation: 0 },
  { sprite: "barrels", x: 1850, y: 3550, size: 80, rotation: -6 },
];

/**
 * The goal. Kept as named level data rather than a special case in the scene,
 * because more stages are planned after this one. Sits in the landing beyond
 * door "2", which the trash plate opens.
 */
export const CHEESE = { x: WORLD_WIDTH / 2, y: T + 110, size: 96 };

export interface ButtonDef extends Rect {}

// centered in the button/trash room, past door "2" and the trash plate
export const BUTTON: ButtonDef = {
  x: WORLD_WIDTH / 2 - 110,
  y: ROOM_TOP + ROOM_HEIGHT / 2 - 70,
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
};

export const ENTITIES: EntityDef[] = [
  // A barrel dwarfs a mouse -- not to real scale, but the size gap has to read. Sits well
  // clear of SPAWN_POINT (which lands ~250px north of it) and every wall.
  { kind: "ball", id: "ball-main", x: 1000, y: 3150, radius: 46, color: "#e0e0e0" },
];
