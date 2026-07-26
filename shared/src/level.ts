import type { Rect } from "./physics.js";

export const WORLD_WIDTH = 2000;
export const WORLD_TOP = -600;
export const LOBBY_HEIGHT = 2150;
export const CORRIDOR_WIDTH = 320;
// Increased to 8620 to fit the 6000px moving room + the 750px expanded maze
export const CORRIDOR_HEIGHT = 8620;
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

export interface MovingLavaWall {
  y: number;
  height: number;
  /** width of the whole solid-gap-solid assembly, less than the room's width so it can slide */
  wallWidth: number;
  /** width of the gap (hole) cut into the wall */
  gapWidth: number;
  /** where the gap's left edge sits within the assembly, measured from the assembly's own left edge */
  gapOffset: number;
  /** world px/sec the assembly sweeps */
  speed: number;
  /** most lanes sweep right to left; a scattered few go the other way for variety */
  direction: "rightToLeft" | "leftToRight";
  /** px added before the loop wraps, so lanes don't all move in lockstep */
  startOffset: number;
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

const CHEESE_LANDING = 110;

const MOVING_ROOM_HEIGHT = 6000;
const MOVING_ROOM_LANES = 50;
const MOVING_ROOM_LANE_HEIGHT = MOVING_ROOM_HEIGHT / MOVING_ROOM_LANES;
const MOVING_WALL_HEIGHT = 36;
const MOVING_WALL_WIDTH = 1300;
const MOVING_WALL_GAP = 160;

const MOVING_ROOM_TOP = T + CHEESE_LANDING;
const MOVING_ROOM_BOTTOM = MOVING_ROOM_TOP + MOVING_ROOM_HEIGHT;
export const MOVING_WALL_ROOM_LEFT = T;
export const MOVING_WALL_ROOM_RIGHT = WORLD_WIDTH - T;
const MOVING_ROOM_ENTRANCE = { x: WORLD_WIDTH / 2, y: MOVING_ROOM_BOTTOM - 40 };

const MOVING_ROOM_STUB_BELOW = 130; // corridor between the maze and this room

// RESTORED: Expanded 1600px Maze
const MAZE_WIDTH = 1600;
const MAZE_LEFT = (WORLD_WIDTH - MAZE_WIDTH) / 2;
const MAZE_RIGHT = MAZE_LEFT + MAZE_WIDTH;
const MAZE_COLS = 8;
const MAZE_ROWS = 10;
const MAZE_CELL_WIDTH = MAZE_WIDTH / MAZE_COLS;
const MAZE_CELL_HEIGHT = 75;
const MAZE_WALL_THICKNESS = 24;
const MAZE_SEED = 1337;

const MAZE_TOP = MOVING_ROOM_BOTTOM + MOVING_ROOM_STUB_BELOW;
const MAZE_BOTTOM = MAZE_TOP + MAZE_ROWS * MAZE_CELL_HEIGHT;
const MAZE_ENTRANCE = {
  x: MAZE_LEFT + (Math.floor(MAZE_COLS / 2) + 0.5) * MAZE_CELL_WIDTH,
  y: MAZE_BOTTOM - MAZE_CELL_HEIGHT / 2,
};

const MAZE_STUB_BELOW = 110;
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

export const MAIN_LOBBY_BOTTOM = CORRIDOR_HEIGHT + 1800;

const HALL_LEFT_WALL_X = 500;
const HALL_RIGHT_WALL_X = 1500;
const ROOM_GAP_TOP = 9120;
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
  { x: 0, y: 0, width: CORRIDOR_LEFT, height: T },
  { x: CORRIDOR_RIGHT, y: 0, width: WORLD_WIDTH - CORRIDOR_RIGHT, height: T },
  { x: 0, y: 0, width: T, height: MAIN_LOBBY_BOTTOM },
  { x: WORLD_WIDTH - T, y: 0, width: T, height: MAIN_LOBBY_BOTTOM },

  // End-credits room, added above the original map without moving it.
  { x: 500, y: WORLD_TOP, width: 1000, height: T },
  { x: 500, y: WORLD_TOP, width: T, height: -WORLD_TOP },
  { x: 1460, y: WORLD_TOP, width: T, height: -WORLD_TOP },

  { x: T, y: T, width: CORRIDOR_LEFT - T, height: MOVING_ROOM_TOP - T },
  {
    x: CORRIDOR_RIGHT,
    y: T,
    width: WORLD_WIDTH - T - CORRIDOR_RIGHT,
    height: MOVING_ROOM_TOP - T,
  },

  { x: T, y: MOVING_ROOM_BOTTOM, width: CORRIDOR_LEFT - T, height: MAZE_TOP - MOVING_ROOM_BOTTOM },
  {
    x: CORRIDOR_RIGHT,
    y: MOVING_ROOM_BOTTOM,
    width: WORLD_WIDTH - T - CORRIDOR_RIGHT,
    height: MAZE_TOP - MOVING_ROOM_BOTTOM,
  },

  // The lava maze's own side walls, perfectly capping the 1600px width
  { x: T, y: MAZE_TOP, width: MAZE_LEFT - T, height: MAZE_BOTTOM - MAZE_TOP },
  {
    x: MAZE_RIGHT,
    y: MAZE_TOP,
    width: WORLD_WIDTH - T - MAZE_RIGHT,
    height: MAZE_BOTTOM - MAZE_TOP,
  },

  { x: T, y: MAZE_BOTTOM, width: CORRIDOR_LEFT - T, height: ROOM_TOP - MAZE_BOTTOM },
  {
    x: CORRIDOR_RIGHT,
    y: MAZE_BOTTOM,
    width: WORLD_WIDTH - T - CORRIDOR_RIGHT,
    height: ROOM_TOP - MAZE_BOTTOM,
  },

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

  { x: HALL_LEFT_WALL_X, y: LOBBY_TOP, width: T, height: ROOM_GAP_TOP - LOBBY_TOP },
  {
    x: HALL_LEFT_WALL_X,
    y: ROOM_GAP_BOTTOM,
    width: T,
    height: MAIN_LOBBY_BOTTOM - ROOM_GAP_BOTTOM,
  },

  { x: HALL_RIGHT_WALL_X, y: LOBBY_TOP, width: T, height: ROOM_GAP_TOP - LOBBY_TOP },
  {
    x: HALL_RIGHT_WALL_X,
    y: ROOM_GAP_BOTTOM,
    width: T,
    height: MAIN_LOBBY_BOTTOM - ROOM_GAP_BOTTOM,
  },

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
    countLabel: "30",
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

  {
    id: "plate-gate-1",
    x: 805,
    y: 8770,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player", color: "#5b8fd9" },
    count: { mode: "exact", value: 3 },
  },
  {
    id: "plate-gate-2",
    x: 955,
    y: 8770,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player", color: "#8b5a3c" },
    count: { mode: "exact", value: 1 },
  },
  {
    id: "plate-gate-3",
    x: 1105,
    y: 8770,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "atLeast", value: 1 },
  },
  {
    id: "plate-colour-inside",
    x: 370,
    y: 9160,
    width: 100,
    height: 120,
    doorIds: ["colour"],
    count: { mode: "atLeast", value: 1 },
  },
  {
    id: "plate-colour-outside",
    x: 570,
    y: 9160,
    width: 100,
    height: 120,
    doorIds: ["colour"],
    count: { mode: "atLeast", value: 1 },
  },
  {
    id: "plate-practice-1",
    x: 1370,
    y: 8990,
    width: 110,
    height: 110,
    doorIds: ["practice"],
    count: { mode: "atLeast", value: 1 },
  },
  {
    id: "plate-practice-2",
    x: 1370,
    y: 9340,
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

export const COLOR_STATIONS: ColorStation[] = [
  { color: "#c4553f", label: "RED", x: 100, y: 8820, width: 70, height: 70 },
  { color: "#5bbf6a", label: "GREEN", x: 215, y: 8820, width: 70, height: 70 },
  { color: "#5b8fd9", label: "BLUE", x: 330, y: 8820, width: 70, height: 70 },
  { color: "#e5b83f", label: "YELLOW", x: 100, y: 8930, width: 70, height: 70 },
  { color: "#9567c6", label: "PURPLE", x: 215, y: 8930, width: 70, height: 70 },
  { color: "#8b5a3c", label: "BROWN", x: 330, y: 8930, width: 70, height: 70 },
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

export function movingWallSegments(
  wall: MovingLavaWall,
  nowMs: number,
  roomLeft: number,
  roomRight: number,
): Rect[] {
  const cycle = roomRight - roomLeft + wall.wallWidth;
  const traveled = ((nowMs / 1000) * wall.speed + wall.startOffset) % cycle;
  const left =
    wall.direction === "leftToRight" ? roomLeft - wall.wallWidth + traveled : roomRight - traveled;
  const gapStart = left + wall.gapOffset;
  const gapEnd = gapStart + wall.gapWidth;
  return [
    { x: left, y: wall.y, width: wall.gapOffset, height: wall.height },
    {
      x: gapEnd,
      y: wall.y,
      width: wall.wallWidth - wall.gapOffset - wall.gapWidth,
      height: wall.height,
    },
  ];
}

const MOVING_LANE_CENTERS = Array.from(
  { length: MOVING_ROOM_LANES },
  (_, i) => MOVING_ROOM_TOP + (i + 0.5) * MOVING_ROOM_LANE_HEIGHT,
);

const MOVING_WALL_CYCLE = MOVING_WALL_ROOM_RIGHT - MOVING_WALL_ROOM_LEFT + MOVING_WALL_WIDTH;
const MOVING_WALL_MAX_GAP_OFFSET = MOVING_WALL_WIDTH - MOVING_WALL_GAP;

export const MOVING_LAVA_WALLS: MovingLavaWall[] = Array.from(
  { length: MOVING_ROOM_LANES },
  (_, i) => ({
    y: MOVING_LANE_CENTERS[i] - MOVING_WALL_HEIGHT / 2,
    height: MOVING_WALL_HEIGHT,
    wallWidth: MOVING_WALL_WIDTH,
    gapWidth: MOVING_WALL_GAP,
    gapOffset: (i * 337) % MOVING_WALL_MAX_GAP_OFFSET,
    speed: 170 + (i % 5) * 20,
    // Deterministic, not Math.random() -- every client evaluates this module independently,
    // so "which lanes run backwards" has to fall out of the lane index the same way on
    // everyone's machine, or players would see different walls going different directions.
    // (i * 41) % 9 === 0 scatters roughly 1 in 9 lanes without a visible repeating cadence.
    direction: (i * 41) % 9 === 0 ? "leftToRight" : "rightToLeft",
    startOffset: (i * 613) % MOVING_WALL_CYCLE,
    teleportTo: MOVING_ROOM_ENTRANCE,
  }),
);

export const FOOTBALL_PITCH: Rect = { x: 90, y: 9440, width: 360, height: 840 };

export interface Slide {
  id: string;
  entry: Rect;
  path: Array<{ x: number; y: number }>;
  speed?: number;
}

export const SLIDES: Slide[] = [
  {
    id: "slide-lobby-to-practice",
    entry: { x: 900, y: 10070, width: 170, height: 170 },
    path: [
      { x: 985, y: 10155 },
      { x: 1000, y: 10420 },
      { x: 1090, y: 10600 },
      { x: 1280, y: 10680 },
      { x: 1470, y: 10630 },
      { x: 1570, y: 10490 },
      { x: 1550, y: 10330 },
      { x: 1430, y: 10240 },
      { x: 1280, y: 10250 },
      { x: 1180, y: 10350 },
      { x: 1180, y: 10480 },
      { x: 1270, y: 10560 },
      { x: 1390, y: 10550 },
      { x: 1470, y: 10470 },
      { x: 1590, y: 10360 },
      { x: 1760, y: 10140 },
    ],
    speed: 850,
  },
];

// FIXED Texts that got broken in the merge + applied +480 shift
export const WORLD_TEXTS: WorldText[] = [
  { x: 1000, y: -510, text: "you found the cheese.", size: 48, rotation: -1 },
  { x: 1000, y: -390, text: "thank you for playin the prototype", size: 30, rotation: 1 },
  { x: 1000, y: -300, text: "adamd  -  Norbiros  -  MrPOP  -  TheTwoBoom", size: 27 },
  { x: 1000, y: -255, text: "and... Claude", size: 28, rotation: -1 },
  {
    x: 1000,
    y: ROOM_TOP + 55, // Dynamic
    text: "THE CHEESE TAX: payable in balls",
    size: 25,
    rotation: -2,
  },
  {
    x: 1000,
    y: LEVEL1_TOP + 60, // Dynamic
    text: "this door hates uneven friendships",
    size: 26,
    rotation: 1,
  },
  { x: 1000, y: 8690, text: "the cheese is a lie.", size: 48, rotation: -2 },
  { x: 1120, y: 9920, text: "look! a droga szybkiego ruchu!", size: 24, rotation: 2 },
  { x: 270, y: 9920, text: "try using the right button", size: 24, rotation: 2 },
  { x: 270, y: 8820, text: "pick a colour", size: 28, rotation: -3 },
  {
    x: 1100,
    y: 9090,
    text: "try the pressure plates here. nothing bad happens.",
    size: 22,
    rotation: 1,
  },
  { x: 1750, y: 8770, text: "no cheese in here :((", size: 24, rotation: -2 },
  { x: 1000, y: 9580, text: "you - are - a - mouse", size: 22, rotation: 2 },
  {
    x: 1000,
    y: 9670,
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

export const DECORATIONS: DecorDef[] = [
  { sprite: "crate", x: 650, y: 8970, size: 70, rotation: 4 },
  { sprite: "barrels", x: 680, y: 9070, size: 85, rotation: -6 },
  { sprite: "plants", x: 650, y: 9270, size: 65, rotation: -5 },
  { sprite: "crate_small", x: 1250, y: 8970, size: 55, rotation: -9 },
  { sprite: "plants", x: 1260, y: 9120, size: 62, rotation: 8 },
  { sprite: "table", x: 680, y: 9920, size: 100, rotation: -2 },
  { sprite: "chair", x: 680, y: 10020, size: 60, rotation: 7 },
  { sprite: "chest", x: 650, y: 10170, size: 75, rotation: -4 },
  { sprite: "campfire", x: 1300, y: 9920, size: 95, rotation: 0 },
  { sprite: "tree", x: 1250, y: 10120, size: 90, rotation: 0 },
  { sprite: "puddle", x: 1350, y: 10220, size: 110, rotation: 0 },
  { sprite: "plants", x: 80, y: 8770, size: 60, rotation: -5 },
  { sprite: "plants", x: 400, y: 8770, size: 60, rotation: 8 },
  { sprite: "carpet", x: 270, y: 9170, size: 150, rotation: 0 },
  { sprite: "chest", x: 150, y: 9320, size: 75, rotation: -4 },
  { sprite: "table", x: 380, y: 9320, size: 95, rotation: 3 },
  { sprite: "chair", x: 380, y: 9410, size: 55, rotation: 6 },
  { sprite: "carpet", x: 1750, y: 8820, size: 120, rotation: 0 },
  { sprite: "crate", x: 1650, y: 8970, size: 70, rotation: 4 },
  { sprite: "crate_small", x: 1850, y: 8970, size: 55, rotation: -8 },
  { sprite: "barrel", x: 1700, y: 9170, size: 60, rotation: 3 },
  { sprite: "table", x: 1850, y: 9220, size: 95, rotation: -2 },
  { sprite: "chair", x: 1850, y: 9310, size: 55, rotation: 6 },
  { sprite: "plants", x: 1620, y: 9420, size: 65, rotation: -5 },
  { sprite: "campfire", x: 1800, y: 9570, size: 90, rotation: 0 },
  { sprite: "chest", x: 1650, y: 9770, size: 75, rotation: -4 },
  { sprite: "tree", x: 1850, y: 9920, size: 85, rotation: 0 },
  { sprite: "puddle", x: 1700, y: 10070, size: 105, rotation: 0 },
  { sprite: "barrels", x: 1850, y: 10170, size: 80, rotation: -6 },
];

/**
 * The goal. Kept as named level data rather than a special case in the scene,
 * because more stages are planned after this one. Sits in the landing above
 * the maze, reached after clearing it and door "2" (which the trash plate opens).
 */
export const CHEESE = { x: WORLD_WIDTH / 2, y: -445, size: 96 };

export const END_CREDITS_GITHUB = { x: 810, y: -180, width: 380, height: 72 };
export const GITHUB_URL = "https://github.com/Zerya-Dev/cursorgame/";

export interface ButtonDef extends Rect {}

export const BUTTON: ButtonDef = {
  x: WORLD_WIDTH / 2 - 110,
  y: ROOM_TOP + ROOM_HEIGHT / 2 - 70,
  width: 220,
  height: 140,
};

export const BUTTON_CLICKS_PER_PLAYER = 50;
export const BUTTON_MIN_CLICK_TARGET = 100;

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
  { kind: "ball", id: "ball-main", x: 1000, y: 9770, radius: 46, color: "#e0e0e0" },
];
