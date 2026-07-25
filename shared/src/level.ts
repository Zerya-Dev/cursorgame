import type { Rect } from "./physics.js";

export const WORLD_WIDTH = 2000;
export const LOBBY_HEIGHT = 2150;
export const CORRIDOR_WIDTH = 320;
export const CORRIDOR_HEIGHT = 2000;
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
const CHEESE_LANDING = 110; // clearance above the maze, where the cheese sits
const MAZE_WIDTH = 900;
const MAZE_LEFT = (WORLD_WIDTH - MAZE_WIDTH) / 2;
const MAZE_RIGHT = MAZE_LEFT + MAZE_WIDTH;
const MAZE_COLS = 5;
const MAZE_ROWS = 6;
const MAZE_CELL_WIDTH = MAZE_WIDTH / MAZE_COLS;
const MAZE_CELL_HEIGHT = 45;
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
  { x: 0, y: 0, width: T, height: MAIN_LOBBY_BOTTOM },
  { x: WORLD_WIDTH - T, y: 0, width: T, height: MAIN_LOBBY_BOTTOM },

  // Cheese's landing above the maze.
  { x: T, y: T, width: CORRIDOR_LEFT - T, height: MAZE_TOP - T },
  { x: CORRIDOR_RIGHT, y: T, width: WORLD_WIDTH - T - CORRIDOR_RIGHT, height: MAZE_TOP - T },

  // The lava maze's own side walls, wider than the corridor.
  { x: T, y: MAZE_TOP, width: MAZE_LEFT - T, height: MAZE_BOTTOM - MAZE_TOP },
  {
    x: MAZE_RIGHT,
    y: MAZE_TOP,
    width: WORLD_WIDTH - T - MAZE_RIGHT,
    height: MAZE_BOTTOM - MAZE_TOP,
  },

  // Corridor from the maze down to the button/trash room, door "2" sitting in this gap.
  // One continuous flanking wall per side (not split at the door) -- same shape as doors
  // "0" and "1" below -- so there's no seam for the wall-stamping corner-joint overshoot
  // to double up on right where the door leaves are.
  { x: T, y: MAZE_BOTTOM, width: CORRIDOR_LEFT - T, height: ROOM_TOP - MAZE_BOTTOM },
  {
    x: CORRIDOR_RIGHT,
    y: MAZE_BOTTOM,
    width: WORLD_WIDTH - T - CORRIDOR_RIGHT,
    height: ROOM_TOP - MAZE_BOTTOM,
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
  // A temporary practice door: it closes again after its plate is released.
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
    countLabel: "ALL",
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
    filter: { entityKind: "player", color: "#5b8fd9" },
    count: { mode: "exact", value: 3 },
  },
  {
    id: "plate-gate-2",
    x: 955,
    y: 2150,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player", color: "#8b5a3c" },
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
    count: { mode: "atLeast", value: 1 },
  },

  // Either side of the colour-room door has its own one-person release plate.
  {
    id: "plate-colour-inside",
    x: 370,
    y: 2540,
    width: 100,
    height: 120,
    doorIds: ["colour"],
    count: { mode: "atLeast", value: 1 },
  },
  {
    id: "plate-colour-outside",
    x: 570,
    y: 2540,
    width: 100,
    height: 120,
    doorIds: ["colour"],
    count: { mode: "atLeast", value: 1 },
  },

  // Two mice or movable objects open the practice room from the lobby.
  {
    id: "plate-practice-1",
    x: 1370,
    y: 2370,
    width: 110,
    height: 110,
    doorIds: ["practice"],
    count: { mode: "atLeast", value: 1 },
  },
  {
    id: "plate-practice-2",
    x: 1370,
    y: 2720,
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

// Moved off the open floor into their own room (west of the main hall).
// Softer, hand-inked tones instead of screen-saturated primaries -- still
// read unambiguously as red/green/blue, but sit on the paper instead of
// fighting it. No black option -- it just vanished into the ink linework.
export const COLOR_STATIONS: ColorStation[] = [
  { color: "#c4553f", label: "RED", x: 100, y: 2200, width: 70, height: 70 },
  { color: "#5bbf6a", label: "GREEN", x: 215, y: 2200, width: 70, height: 70 },
  { color: "#5b8fd9", label: "BLUE", x: 330, y: 2200, width: 70, height: 70 },
  { color: "#e5b83f", label: "YELLOW", x: 100, y: 2310, width: 70, height: 70 },
  { color: "#9567c6", label: "PURPLE", x: 215, y: 2310, width: 70, height: 70 },
  { color: "#8b5a3c", label: "BROWN", x: 330, y: 2310, width: 70, height: 70 },
];

// Seeded PRNG (mulberry32) so maze generation is deterministic -- this module runs
// independently in the frontend bundle and the backend process, and both need to land
// on the identical maze without talking to each other.
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

/**
 * Randomized depth-first search (a "recursive backtracker"): carves a spanning tree over
 * the grid, so there's exactly one path between any two cells. hWalls[r][c] is the wall
 * between (r, c) and (r + 1, c); vWalls[r][c] is the wall between (r, c) and (r, c + 1).
 */
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

// A tiny football pitch in the lower colour room. The movable barrel is the ball.
export const FOOTBALL_PITCH: Rect = { x: 90, y: 2820, width: 360, height: 840 };

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
  // Starts at the middle-bottom, dives outside the lobby, curls through a
  // southern spiral, then tunnels back into the practice room.
  {
    id: "slide-lobby-to-practice",
    entry: { x: 900, y: 3450, width: 170, height: 170 },
    path: [
      { x: 985, y: 3535 },
      { x: 1000, y: 3800 },
      { x: 1090, y: 3980 },
      { x: 1280, y: 4060 },
      { x: 1470, y: 4010 },
      { x: 1570, y: 3870 },
      { x: 1550, y: 3710 },
      { x: 1430, y: 3620 },
      { x: 1280, y: 3630 },
      { x: 1180, y: 3730 },
      { x: 1180, y: 3860 },
      { x: 1270, y: 3940 },
      { x: 1390, y: 3930 },
      { x: 1470, y: 3850 },
      { x: 1590, y: 3740 },
      { x: 1760, y: 3520 },
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
    x: 1000,
    y: ROOM_TOP + 55,
    text: "THE CHEESE TAX: payable in balls",
    size: 25,
    rotation: -2,
  },
  {
    x: 1000,
    y: LEVEL1_TOP + 60,
    text: "this door hates uneven friendships",
    size: 26,
    rotation: 1,
  },
  { x: 1000, y: 2070, text: "the cheese is a lie.", size: 48, rotation: -2 },
  { x: 292, y: 3300, text: "look! a droga szybkiego ruchu!", size: 24, rotation: 2 },
  { x: 270, y: 2200, text: "pick a colour", size: 28, rotation: -3 },
  {
    x: 1270,
    y: 2470,
    text: "try the pressure plates here. nothing bad happens.",
    size: 22,
    rotation: 1,
  },
  { x: 1750, y: 2150, text: "no cheese in here :((", size: 24, rotation: -2 },
  { x: 1000, y: 2960, text: "you - are - a - mouse", size: 22, rotation: 2 },
  {
    x: 1000,
    y: 3050,
    text: "try to push this around while you wait for others v",
    size: 20,
    rotation: -1,
  },
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
 * because more stages are planned after this one. Sits in the landing above
 * the maze, reached after clearing it and door "2" (which the trash plate opens).
 */
export const CHEESE = { x: WORLD_WIDTH / 2, y: T + CHEESE_LANDING / 2, size: 96 };

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
