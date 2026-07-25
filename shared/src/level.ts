import type { Rect } from "./physics.js";

export const WORLD_WIDTH = 2000;
export const LOBBY_HEIGHT = 2150;
export const CORRIDOR_WIDTH = 320;
// INCREASED BY 600 to fit the new massive maze
export const CORRIDOR_HEIGHT = 2600;
export const WORLD_HEIGHT = LOBBY_HEIGHT + CORRIDOR_HEIGHT;

export const PLAYER_RADIUS = 12;

export type Obstacle = Rect;

export interface Door extends Rect {
  id: string;
  /** once opened, stays open forever instead of re-locking when plates release */
  permanent?: boolean;
  /** each inner list is an AND group; satisfying any group opens the door */
  plateGroups?: string[][];
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
  countLabel?: string;
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
// (the goal) beyond a lava maze -- Level 3 -- then the button/trash room
// (Level 2), then Level 1's balance-plate room, then the funnel down into the
// lobby. Every one of these sits *above* LOBBY_TOP, so the lobby itself (and
// everything in it) keeps its original coordinates.

// Level 3: a lava maze, laid out on a grid and carved with a randomized
// depth-first search ("recursive backtracker") so there's exactly one path
// through. Wider than the corridor, with narrow stubs re-joining the
// corridor's width at both ends. Touch a wall and you're bounced back to the
// maze's entrance instead of dying.
const CHEESE_LANDING = 200; // clearance above the maze, where the cheese sits
const MAZE_WIDTH = 1920;
const MAZE_LEFT = (WORLD_WIDTH - MAZE_WIDTH) / 2;
//const MAZE_RIGHT = MAZE_LEFT + MAZE_WIDTH;
const MAZE_COLS = 8;
const MAZE_ROWS = 10;
const MAZE_CELL_WIDTH = MAZE_WIDTH / MAZE_COLS;
const MAZE_CELL_HEIGHT = 75;
const MAZE_WALL_THICKNESS = 24;
const MAZE_SEED = 1337; // fixed so the frontend and backend independently carve the same maze

const MAZE_TOP = T + CHEESE_LANDING;
const MAZE_BOTTOM = MAZE_TOP + MAZE_ROWS * MAZE_CELL_HEIGHT;
const MAZE_ENTRANCE = {
  x: MAZE_LEFT + (Math.floor(MAZE_COLS / 2) + 0.5) * MAZE_CELL_WIDTH,
  y: MAZE_BOTTOM - MAZE_CELL_HEIGHT / 2,
};

const MAZE_STUB_BELOW = 110; // re-joins the corridor's width down to door "2"
const DOOR2_Y = MAZE_BOTTOM + MAZE_STUB_BELOW;
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

// The original lobby edge; the slide now has its own open strip below it.
export const MAIN_LOBBY_BOTTOM = CORRIDOR_HEIGHT + 1800;

// The lobby is split into three rooms side-by-side: a colour room (west), the
// main hall (centre, under the corridor exit), and a practice room (east).
// Both dividing walls are vertical, each with a single gap partway down.
const HALL_LEFT_WALL_X = 500; // colour room | main hall
const HALL_RIGHT_WALL_X = 1500; // main hall | practice room
const ROOM_GAP_TOP = 3100; // SHIFTED +600
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
  { x: 0, y: 0, width: T, height: MAIN_LOBBY_BOTTOM },
  { x: WORLD_WIDTH - T, y: 0, width: T, height: MAIN_LOBBY_BOTTOM },

  // Cheese's landing above the maze.
  { x: T, y: T, width: CORRIDOR_LEFT - T, height: MAZE_TOP - T },
  { x: CORRIDOR_RIGHT, y: T, width: WORLD_WIDTH - T - CORRIDOR_RIGHT, height: MAZE_TOP - T },

  // The lava maze's own side walls, wider than the corridor.
  /*
  { x: T, y: MAZE_TOP, width: MAZE_LEFT - T, height: MAZE_BOTTOM - MAZE_TOP },
  {
    x: MAZE_RIGHT,
    y: MAZE_TOP,
    width: WORLD_WIDTH - T - MAZE_RIGHT,
    height: MAZE_BOTTOM - MAZE_TOP,
  },
*/
  // Corridor from the maze down to the button/trash room, door "2" sitting in this gap.
  { x: T, y: MAZE_BOTTOM, width: CORRIDOR_LEFT - T, height: ROOM_TOP - MAZE_BOTTOM },
  {
    x: CORRIDOR_RIGHT,
    y: MAZE_BOTTOM,
    width: WORLD_WIDTH - T - CORRIDOR_RIGHT,
    height: ROOM_TOP - MAZE_BOTTOM,
  },

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

  // Colour room | main hall divider. The gap is filled by door "colour" below.
  { x: HALL_LEFT_WALL_X, y: LOBBY_TOP, width: T, height: ROOM_GAP_TOP - LOBBY_TOP },
  {
    x: HALL_LEFT_WALL_X,
    y: ROOM_GAP_BOTTOM,
    width: T,
    height: MAIN_LOBBY_BOTTOM - ROOM_GAP_BOTTOM,
  },

  // Main hall | practice room divider. Gap is filled by door "practice" below.
  { x: HALL_RIGHT_WALL_X, y: LOBBY_TOP, width: T, height: ROOM_GAP_TOP - LOBBY_TOP },
  {
    x: HALL_RIGHT_WALL_X,
    y: ROOM_GAP_BOTTOM,
    width: T,
    height: MAIN_LOBBY_BOTTOM - ROOM_GAP_BOTTOM,
  },

  // The old lobby edge remains as a boundary; the slide dives beneath it into
  // its own southern run and tunnels back up into the practice room.
  { x: T, y: MAIN_LOBBY_BOTTOM, width: WORLD_WIDTH - T * 2, height: T },
];

export const DOORS: Door[] = [
  { x: CORRIDOR_LEFT, y: DOOR2_Y, width: CORRIDOR_WIDTH, height: 30, id: "2", permanent: true },
  {
    x: CORRIDOR_LEFT,
    y: LEVEL1_DOOR_Y,
    width: CORRIDOR_WIDTH,
    height: 30,
    id: "1",
    permanent: true,
  },
  {
    x: CORRIDOR_LEFT,
    y: LOBBY_TOP - 30,
    width: CORRIDOR_WIDTH,
    height: 30,
    id: "0",
    permanent: true,
  },
  {
    x: HALL_LEFT_WALL_X,
    y: ROOM_GAP_TOP,
    width: T,
    height: ROOM_GAP_HEIGHT,
    id: "colour",
    plateGroups: [["plate-colour-inside"], ["plate-colour-outside"]],
  },
  {
    x: HALL_RIGHT_WALL_X,
    y: ROOM_GAP_TOP,
    width: T,
    height: ROOM_GAP_HEIGHT,
    id: "practice",
    plateGroups: [["plate-practice-1", "plate-practice-2"]],
  },
];

export const PLATES: PressurePlate[] = [
  {
    id: "plate-trash",
    x: 120,
    y: ROOM_TOP + 100,
    width: 280,
    height: 300,
    doorIds: [],
    filter: { entityKind: "ball" },
    label: "trash",
    countLabel: "ALL",
  },
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

  // ALL LOBBY PLATES SHIFTED +600
  {
    id: "plate-gate-1",
    x: 805,
    y: 2750,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player", color: "#5b8fd9" },
    count: { mode: "exact", value: 3 },
  },
  {
    id: "plate-gate-2",
    x: 955,
    y: 2750,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player", color: "#8b5a3c" },
    count: { mode: "exact", value: 1 },
  },
  {
    id: "plate-gate-3",
    x: 1105,
    y: 2750,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "atLeast", value: 1 },
  },
  {
    id: "plate-colour-inside",
    x: 370,
    y: 3140,
    width: 100,
    height: 120,
    doorIds: ["colour"],
    count: { mode: "atLeast", value: 1 },
  },
  {
    id: "plate-colour-outside",
    x: 570,
    y: 3140,
    width: 100,
    height: 120,
    doorIds: ["colour"],
    count: { mode: "atLeast", value: 1 },
  },
  {
    id: "plate-practice-1",
    x: 1370,
    y: 2970,
    width: 110,
    height: 110,
    doorIds: ["practice"],
    count: { mode: "atLeast", value: 1 },
  },
  {
    id: "plate-practice-2",
    x: 1370,
    y: 3320,
    width: 110,
    height: 110,
    doorIds: ["practice"],
    count: { mode: "atLeast", value: 1 },
  },
];

export const TRASH_PLATE_ID = "plate-trash";
export const TRASH_DOOR_ID = "2";

export const DOOR_RECTS: Record<string, Rect> = Object.fromEntries(
  DOORS.map((door) => [door.id, door]),
);
export const DOOR_IDS = DOORS.map((door) => door.id);

// SHIFTED +600
export const COLOR_STATIONS: ColorStation[] = [
  { color: "#c4553f", label: "RED", x: 100, y: 2800, width: 70, height: 70 },
  { color: "#5bbf6a", label: "GREEN", x: 215, y: 2800, width: 70, height: 70 },
  { color: "#5b8fd9", label: "BLUE", x: 330, y: 2800, width: 70, height: 70 },
  { color: "#e5b83f", label: "YELLOW", x: 100, y: 2910, width: 70, height: 70 },
  { color: "#9567c6", label: "PURPLE", x: 215, y: 2910, width: 70, height: 70 },
  { color: "#8b5a3c", label: "BROWN", x: 330, y: 2910, width: 70, height: 70 },
];

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function carveMaze(cols: number, rows: number, seed: number) {
  const rand = mulberry32(seed);
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const hWalls: boolean[][] = Array.from({ length: rows - 1 }, () => Array(cols).fill(true));
  const vWalls: boolean[][] = Array.from({ length: rows }, () => Array(cols - 1).fill(true));

  const stack: Array<[number, number]> = [[0, 0]];
  visited[0][0] = true;
  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const neighbors: Array<[number, number, "N" | "S" | "E" | "W"]> = [];
    if (r > 0 && !visited[r - 1][c]) neighbors.push([r - 1, c, "N"]);
    if (r < rows - 1 && !visited[r + 1][c]) neighbors.push([r + 1, c, "S"]);
    if (c > 0 && !visited[r][c - 1]) neighbors.push([r, c - 1, "W"]);
    if (c < cols - 1 && !visited[r][c + 1]) neighbors.push([r, c + 1, "E"]);

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }
    const [nr, nc, dir] = neighbors[Math.floor(rand() * neighbors.length)];
    if (dir === "N") hWalls[r - 1][c] = false;
    else if (dir === "S") hWalls[r][c] = false;
    else if (dir === "W") vWalls[r][c - 1] = false;
    else vWalls[r][c] = false;
    visited[nr][nc] = true;
    stack.push([nr, nc]);
  }
  return { hWalls, vWalls };
}

function buildMazeLavaZones(): LavaZone[] {
  const { hWalls, vWalls } = carveMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED);
  const zones: LavaZone[] = [];

  for (let r = 0; r < MAZE_ROWS - 1; r++) {
    for (let c = 0; c < MAZE_COLS; c++) {
      if (!hWalls[r][c]) continue;
      zones.push({
        x: MAZE_LEFT + c * MAZE_CELL_WIDTH,
        y: MAZE_TOP + (r + 1) * MAZE_CELL_HEIGHT - MAZE_WALL_THICKNESS / 2,
        width: MAZE_CELL_WIDTH,
        height: MAZE_WALL_THICKNESS,
        teleportTo: MAZE_ENTRANCE,
      });
    }
  }
  for (let r = 0; r < MAZE_ROWS; r++) {
    for (let c = 0; c < MAZE_COLS - 1; c++) {
      if (!vWalls[r][c]) continue;
      zones.push({
        x: MAZE_LEFT + (c + 1) * MAZE_CELL_WIDTH - MAZE_WALL_THICKNESS / 2,
        y: MAZE_TOP + r * MAZE_CELL_HEIGHT,
        width: MAZE_WALL_THICKNESS,
        height: MAZE_CELL_HEIGHT,
        teleportTo: MAZE_ENTRANCE,
      });
    }
  }
  return zones;
}

export const LAVA_ZONES: LavaZone[] = buildMazeLavaZones();

// SHIFTED +600
export const FOOTBALL_PITCH: Rect = { x: 90, y: 3420, width: 360, height: 840 };

export interface Slide {
  id: string;
  entry: Rect;
  path: Array<{ x: number; y: number }>;
  speed?: number;
}

// ALL Y-VALUES SHIFTED +600
export const SLIDES: Slide[] = [
  {
    id: "slide-lobby-to-practice",
    entry: { x: 900, y: 4050, width: 170, height: 170 },
    path: [
      { x: 985, y: 4135 },
      { x: 1000, y: 4400 },
      { x: 1090, y: 4580 },
      { x: 1280, y: 4660 },
      { x: 1470, y: 4610 },
      { x: 1570, y: 4470 },
      { x: 1550, y: 4310 },
      { x: 1430, y: 4220 },
      { x: 1280, y: 4230 },
      { x: 1180, y: 4330 },
      { x: 1180, y: 4460 },
      { x: 1270, y: 4540 },
      { x: 1390, y: 4530 },
      { x: 1470, y: 4450 },
      { x: 1590, y: 4340 },
      { x: 1760, y: 4120 },
    ],
    speed: 850,
  },
];

// LOBBY TEXTS SHIFTED +600
export const WORLD_TEXTS: WorldText[] = [
  {
    x: 1000,
    y: ROOM_TOP + 55, // Dynamic, stays the same
    text: "THE CHEESE TAX: payable in balls",
    size: 25,
    rotation: -2,
  },
  {
    x: 1000,
    y: LEVEL1_TOP + 60, // Dynamic, stays the same
    text: "this door hates uneven friendships",
    size: 26,
    rotation: 1,
  },
  { x: 1000, y: 2670, text: "the cheese is a lie.", size: 48, rotation: -2 },
  { x: 292, y: 3900, text: "look! a droga szybkiego ruchu!", size: 24, rotation: 2 },
  { x: 270, y: 2800, text: "pick a colour", size: 28, rotation: -3 },
  {
    x: 1270,
    y: 3070,
    text: "try the pressure plates here. nothing bad happens.",
    size: 22,
    rotation: 1,
  },
  { x: 1750, y: 2750, text: "no cheese in here :((", size: 24, rotation: -2 },
  { x: 1000, y: 3560, text: "you - are - a - mouse", size: 22, rotation: 2 },
  {
    x: 1000,
    y: 3650,
    text: "try to push this around while you wait for others v",
    size: 20,
    rotation: -1,
  },
];

export interface DecorDef {
  sprite: string;
  x: number;
  y: number;
  size?: number;
  rotation?: number;
}

// ALL Y-VALUES SHIFTED +600
export const DECORATIONS: DecorDef[] = [
  { sprite: "crate", x: 650, y: 2950, size: 70, rotation: 4 },
  { sprite: "barrels", x: 680, y: 3050, size: 85, rotation: -6 },
  { sprite: "plants", x: 650, y: 3250, size: 65, rotation: -5 },
  { sprite: "crate_small", x: 1250, y: 2950, size: 55, rotation: -9 },
  { sprite: "plants", x: 1260, y: 3100, size: 62, rotation: 8 },
  { sprite: "table", x: 680, y: 3900, size: 100, rotation: -2 },
  { sprite: "chair", x: 680, y: 4000, size: 60, rotation: 7 },
  { sprite: "chest", x: 650, y: 4150, size: 75, rotation: -4 },
  { sprite: "campfire", x: 1300, y: 3900, size: 95, rotation: 0 },
  { sprite: "tree", x: 1250, y: 4100, size: 90, rotation: 0 },
  { sprite: "puddle", x: 1350, y: 4200, size: 110, rotation: 0 },
  { sprite: "plants", x: 80, y: 2750, size: 60, rotation: -5 },
  { sprite: "plants", x: 400, y: 2750, size: 60, rotation: 8 },
  { sprite: "carpet", x: 270, y: 3150, size: 150, rotation: 0 },
  { sprite: "chest", x: 150, y: 3300, size: 75, rotation: -4 },
  { sprite: "table", x: 380, y: 3300, size: 95, rotation: 3 },
  { sprite: "chair", x: 380, y: 3390, size: 55, rotation: 6 },
  { sprite: "carpet", x: 1750, y: 2800, size: 120, rotation: 0 },
  { sprite: "crate", x: 1650, y: 2950, size: 70, rotation: 4 },
  { sprite: "crate_small", x: 1850, y: 2950, size: 55, rotation: -8 },
  { sprite: "barrel", x: 1700, y: 3150, size: 60, rotation: 3 },
  { sprite: "table", x: 1850, y: 3200, size: 95, rotation: -2 },
  { sprite: "chair", x: 1850, y: 3290, size: 55, rotation: 6 },
  { sprite: "plants", x: 1620, y: 3400, size: 65, rotation: -5 },
  { sprite: "campfire", x: 1800, y: 3550, size: 90, rotation: 0 },
  { sprite: "chest", x: 1650, y: 3750, size: 75, rotation: -4 },
  { sprite: "tree", x: 1850, y: 3900, size: 85, rotation: 0 },
  { sprite: "puddle", x: 1700, y: 4050, size: 105, rotation: 0 },
  { sprite: "barrels", x: 1850, y: 4150, size: 80, rotation: -6 },
];

export const CHEESE = { x: WORLD_WIDTH / 2, y: T + CHEESE_LANDING / 2, size: 96 };

export interface ButtonDef extends Rect {}

export const BUTTON: ButtonDef = {
  x: WORLD_WIDTH / 2 - 110,
  y: ROOM_TOP + ROOM_HEIGHT / 2 - 70,
  width: 220,
  height: 140,
};

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

// SHIFTED +600
export const ENTITIES: EntityDef[] = [
  { kind: "ball", id: "ball-main", x: 1000, y: 3750, radius: 46, color: "#e0e0e0" },
];
