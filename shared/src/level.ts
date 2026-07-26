import type { Rect } from "./physics.js";

const MAP_WIDTH = 2000;
export const WORLD_WIDTH = MAP_WIDTH;
export const WORLD_TOP = -600;
export const LOBBY_HEIGHT = 2150;
export const CORRIDOR_WIDTH = 320;

export const PLAYER_RADIUS = 12;

/**
 * Fixed-point scale for the networked player angle. Angles are normalised to
 * (-pi, pi] and sent as `int16`, so pi * ANGLE_SCALE must stay under 32767.
 */
export const ANGLE_SCALE = 10000;

export type Obstacle = Rect;

export interface Door extends Rect {
  id: string;
  permanent?: boolean;
  plateGroups?: string[][];
}

export interface PlateFilter {
  entityKind?: string;
  color?: string;
  charged?: boolean;
}

export type PlateCountRule =
  | { mode: "atLeast"; value: number }
  | { mode: "exact"; value: number }
  | { mode: "even" }
  | { mode: "allPlayers" }
  | { mode: "balance"; withPlateId: string; maxDifference?: number; minParticipants?: number };

export interface PressurePlate extends Rect {
  id: string;
  doorIds: string[];
  filter?: PlateFilter;
  count?: PlateCountRule;
  label?: string;
  countLabel?: string;
  hidden?: boolean;
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
  wallWidth: number;
  gapWidth: number;
  gapOffset: number;
  speed: number;
  direction: "rightToLeft" | "leftToRight";
  startOffset: number;
  teleportTo: { x: number; y: number };
}

export interface WorldText {
  x: number;
  y: number;
  text: string;
  size: number;
  rotation?: number;
}

const T = 40; // wall thickness

/*  REFERENCE POINTS IN WORLD  */

const CORRIDOR_LEFT = (MAP_WIDTH - CORRIDOR_WIDTH) / 2;
const CORRIDOR_RIGHT = CORRIDOR_LEFT + CORRIDOR_WIDTH;

const CHEESE_LANDING = 110;

const MOVING_ROOM_HEIGHT = 1260; // 84 for each lane v
const MOVING_ROOM_LANES = 15;
const MOVING_ROOM_LANE_HEIGHT = MOVING_ROOM_HEIGHT / MOVING_ROOM_LANES;
const MOVING_WALL_HEIGHT = 36;
const MOVING_WALL_WIDTH = 1300;
const MOVING_WALL_GAP = 160;

const MOVING_ROOM_TOP = T + CHEESE_LANDING;
const MOVING_ROOM_BOTTOM = MOVING_ROOM_TOP + MOVING_ROOM_HEIGHT;
export const MOVING_WALL_ROOM_LEFT = T;
export const MOVING_WALL_ROOM_RIGHT = MAP_WIDTH - T;
const MOVING_ROOM_ENTRANCE = { x: MAP_WIDTH / 2, y: MOVING_ROOM_BOTTOM - 40 };

export const END_POWER_MIN_PLAYERS = 3;
export const END_POWER_PLATE_ID = "plate-end-power";

const MOVING_ROOM_STUB_BELOW = 130; // corridor between the maze and this room

const MAZE_WIDTH = 1840; // CHANGABLE VARS @Damian
const MAZE_LEFT = (MAP_WIDTH - MAZE_WIDTH) / 2;
const MAZE_RIGHT = MAZE_LEFT + MAZE_WIDTH;
const MAZE_COLS = 8;
const MAZE_ROWS = 16;
const MAZE_SECTOR_ROWS = 4;
const MAZE_CELL_WIDTH = MAZE_WIDTH / MAZE_COLS;
const MAZE_CELL_HEIGHT = 150;
const MAZE_WALL_THICKNESS = 24;
const MAZE_SEED = 1337;

const MAZE_TOP = MOVING_ROOM_BOTTOM + MOVING_ROOM_STUB_BELOW;
const MAZE_BOTTOM = MAZE_TOP + MAZE_ROWS * MAZE_CELL_HEIGHT;
const MAZE_GATE_THICKNESS = 30;
const MAZE_GATE_WIDTH = MAZE_CELL_WIDTH;
const MAZE_GATE_A_Y = MAZE_TOP + MAZE_SECTOR_ROWS * MAZE_CELL_HEIGHT;
const MAZE_GATE_B_Y = MAZE_TOP + MAZE_SECTOR_ROWS * 2 * MAZE_CELL_HEIGHT;
const MAZE_GATE_C_Y = MAZE_TOP + MAZE_SECTOR_ROWS * 3 * MAZE_CELL_HEIGHT;
const MAZE_GATE_A_X = MAZE_LEFT + MAZE_CELL_WIDTH * 2;
const MAZE_GATE_B_X = MAZE_LEFT + MAZE_CELL_WIDTH * 6;
const MAZE_GATE_C_X = MAZE_LEFT + MAZE_CELL_WIDTH * 3;
const MAZE_EXIT_X = MAZE_LEFT + MAZE_CELL_WIDTH * 4;
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

// The lobby below was laid out against a fixed LOBBY_TOP of 8620. Anchor it to the end
// of the corridor chain instead (plus the original slack) and shift the whole lobby by
// the difference, so shortening a room above actually shortens the level.
const LOBBY_ANCHOR = 8620;
const LOBBY_STUB = 310;
const LOBBY_TOP = LEVEL1_BOTTOM + LOBBY_STUB;
const LOBBY_OFFSET = LOBBY_TOP - LOBBY_ANCHOR;
export const CORRIDOR_HEIGHT = LOBBY_TOP;
export const WORLD_HEIGHT = LOBBY_HEIGHT + CORRIDOR_HEIGHT;

function shiftY<T extends { y: number }>(item: T): T {
  return { ...item, y: item.y + LOBBY_OFFSET };
}

export const END_POWER_SOURCE: Rect = shiftY({ x: 1580, y: 9420, width: 60, height: 60 });
export const END_POWER_TARGET: Rect = shiftY({ x: 1790, y: 9400, width: 100, height: 100 });
export const POWERED_CAMPFIRE = shiftY({ x: 1840, y: 9450, size: 110 });

export const MAIN_LOBBY_BOTTOM = CORRIDOR_HEIGHT + 1800;

const HALL_LEFT_WALL_X = 500;
const HALL_RIGHT_WALL_X = 1500;
const ROOM_GAP_TOP = 9120 + LOBBY_OFFSET;
const ROOM_GAP_HEIGHT = 200;
const ROOM_GAP_BOTTOM = ROOM_GAP_TOP + ROOM_GAP_HEIGHT;

export const SPAWN_POINT = { x: MAP_WIDTH / 2, y: LOBBY_TOP + LOBBY_HEIGHT / 2 };

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
  { x: 0, y: 0, width: CORRIDOR_LEFT, height: T },
  { x: CORRIDOR_RIGHT, y: 0, width: MAP_WIDTH - CORRIDOR_RIGHT, height: T },
  { x: 0, y: 0, width: T, height: MAIN_LOBBY_BOTTOM },
  { x: MAP_WIDTH - T, y: 0, width: T, height: MAIN_LOBBY_BOTTOM },

  { x: 500, y: WORLD_TOP, width: 1000, height: T },
  { x: 500, y: WORLD_TOP, width: T, height: -WORLD_TOP },
  { x: 1460, y: WORLD_TOP, width: T, height: -WORLD_TOP },

  { x: T, y: T, width: CORRIDOR_LEFT - T, height: MOVING_ROOM_TOP - T },
  {
    x: CORRIDOR_RIGHT,
    y: T,
    width: MAP_WIDTH - T - CORRIDOR_RIGHT,
    height: MOVING_ROOM_TOP - T,
  },

  { x: T, y: MOVING_ROOM_BOTTOM, width: CORRIDOR_LEFT - T, height: MAZE_TOP - MOVING_ROOM_BOTTOM },
  {
    x: CORRIDOR_RIGHT,
    y: MOVING_ROOM_BOTTOM,
    width: MAP_WIDTH - T - CORRIDOR_RIGHT,
    height: MAZE_TOP - MOVING_ROOM_BOTTOM,
  },

  { x: T, y: MAZE_TOP, width: MAZE_LEFT - T, height: MAZE_BOTTOM - MAZE_TOP },
  {
    x: MAZE_RIGHT,
    y: MAZE_TOP,
    width: MAP_WIDTH - T - MAZE_RIGHT,
    height: MAZE_BOTTOM - MAZE_TOP,
  },

  { x: MAZE_LEFT, y: MAZE_GATE_A_Y, width: MAZE_GATE_A_X - MAZE_LEFT, height: MAZE_GATE_THICKNESS },
  {
    x: MAZE_GATE_A_X + MAZE_GATE_WIDTH,
    y: MAZE_GATE_A_Y,
    width: MAZE_RIGHT - MAZE_GATE_A_X - MAZE_GATE_WIDTH,
    height: MAZE_GATE_THICKNESS,
  },
  { x: MAZE_LEFT, y: MAZE_GATE_B_Y, width: MAZE_GATE_B_X - MAZE_LEFT, height: MAZE_GATE_THICKNESS },
  {
    x: MAZE_GATE_B_X + MAZE_GATE_WIDTH,
    y: MAZE_GATE_B_Y,
    width: MAZE_RIGHT - MAZE_GATE_B_X - MAZE_GATE_WIDTH,
    height: MAZE_GATE_THICKNESS,
  },
  {
    x: MAZE_LEFT,
    y: MAZE_GATE_C_Y,
    width: MAZE_GATE_C_X - MAZE_LEFT,
    height: MAZE_GATE_THICKNESS,
  },
  {
    x: MAZE_GATE_C_X + MAZE_GATE_WIDTH,
    y: MAZE_GATE_C_Y,
    width: MAZE_RIGHT - MAZE_GATE_C_X - MAZE_GATE_WIDTH,
    height: MAZE_GATE_THICKNESS,
  },
  { x: MAZE_LEFT, y: MAZE_TOP, width: MAZE_EXIT_X - MAZE_LEFT, height: MAZE_GATE_THICKNESS },
  {
    x: MAZE_EXIT_X + MAZE_GATE_WIDTH,
    y: MAZE_TOP,
    width: MAZE_RIGHT - MAZE_EXIT_X - MAZE_GATE_WIDTH,
    height: MAZE_GATE_THICKNESS,
  },

  { x: T, y: MAZE_BOTTOM, width: CORRIDOR_LEFT - T, height: ROOM_TOP - MAZE_BOTTOM },
  {
    x: CORRIDOR_RIGHT,
    y: MAZE_BOTTOM,
    width: MAP_WIDTH - T - CORRIDOR_RIGHT,
    height: ROOM_TOP - MAZE_BOTTOM,
  },

  { x: T, y: ROOM_BOTTOM, width: CORRIDOR_LEFT - T, height: LEVEL1_TOP - ROOM_BOTTOM },
  {
    x: CORRIDOR_RIGHT,
    y: ROOM_BOTTOM,
    width: MAP_WIDTH - T - CORRIDOR_RIGHT,
    height: LEVEL1_TOP - ROOM_BOTTOM,
  },

  { x: T, y: LEVEL1_TOP, width: LEVEL1_LEFT - T, height: LEVEL1_BOTTOM - LEVEL1_TOP },
  {
    x: LEVEL1_RIGHT,
    y: LEVEL1_TOP,
    width: MAP_WIDTH - T - LEVEL1_RIGHT,
    height: LEVEL1_BOTTOM - LEVEL1_TOP,
  },

  { x: T, y: LEVEL1_BOTTOM, width: CORRIDOR_LEFT - T, height: LOBBY_TOP - LEVEL1_BOTTOM },
  {
    x: CORRIDOR_RIGHT,
    y: LEVEL1_BOTTOM,
    width: MAP_WIDTH - T - CORRIDOR_RIGHT,
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

  { x: T, y: MAIN_LOBBY_BOTTOM, width: MAP_WIDTH - T * 2, height: T },
];

export const DOORS: Door[] = [
  {
    x: MAZE_GATE_A_X,
    y: MAZE_GATE_A_Y,
    width: MAZE_GATE_WIDTH,
    height: MAZE_GATE_THICKNESS,
    id: "maze-a",
    plateGroups: [["plate-maze-a-south"], ["plate-maze-a-north"]],
  },
  {
    x: MAZE_GATE_B_X,
    y: MAZE_GATE_B_Y,
    width: MAZE_GATE_WIDTH,
    height: MAZE_GATE_THICKNESS,
    id: "maze-b",
    plateGroups: [["plate-maze-b-south"], ["plate-maze-b-north"]],
  },
  {
    x: MAZE_GATE_C_X,
    y: MAZE_GATE_C_Y,
    width: MAZE_GATE_WIDTH,
    height: MAZE_GATE_THICKNESS,
    id: "maze-c",
    plateGroups: [["plate-maze-c-south"], ["plate-maze-c-north"]],
  },
  {
    x: MAZE_EXIT_X,
    y: MAZE_TOP,
    width: MAZE_GATE_WIDTH,
    height: MAZE_GATE_THICKNESS,
    id: "maze-exit",
    plateGroups: [["plate-maze-exit-ball"]],
  },
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
    id: END_POWER_PLATE_ID,
    ...END_POWER_TARGET,
    doorIds: [],
    filter: { entityKind: "player", charged: true },
    hidden: true,
  },
  {
    id: "plate-maze-c-south",
    x: MAZE_RIGHT - 150,
    y: MAZE_GATE_C_Y + 70,
    width: 100,
    height: 90,
    doorIds: ["maze-c"],
    filter: { entityKind: "player" },
    label: "C SOUTH",
  },
  {
    id: "plate-maze-c-north",
    x: MAZE_RIGHT - 150,
    y: MAZE_GATE_C_Y - 160,
    width: 100,
    height: 90,
    doorIds: ["maze-c"],
    filter: { entityKind: "player" },
    label: "C NORTH",
  },
  {
    id: "plate-maze-a-south",
    x: MAZE_RIGHT - 150,
    y: MAZE_GATE_A_Y + 55,
    width: 100,
    height: 90,
    doorIds: ["maze-a"],
    filter: { entityKind: "player" },
    label: "A SOUTH",
  },
  {
    id: "plate-maze-a-north",
    x: MAZE_RIGHT - 150,
    y: MAZE_GATE_A_Y - 145,
    width: 100,
    height: 90,
    doorIds: ["maze-a"],
    filter: { entityKind: "player" },
    label: "A NORTH",
  },
  {
    id: "plate-maze-b-south",
    x: MAZE_LEFT + 50,
    y: MAZE_GATE_B_Y + 55,
    width: 100,
    height: 90,
    doorIds: ["maze-b"],
    filter: { entityKind: "player" },
    label: "B SOUTH",
  },
  {
    id: "plate-maze-b-north",
    x: MAZE_LEFT + 50,
    y: MAZE_GATE_B_Y - 145,
    width: 100,
    height: 90,
    doorIds: ["maze-b"],
    filter: { entityKind: "player" },
    label: "B NORTH",
  },
  {
    id: "plate-maze-exit-ball",
    x: MAZE_RIGHT - 160,
    y: MAZE_TOP + 65,
    width: 110,
    height: 100,
    doorIds: ["maze-exit"],
    filter: { entityKind: "ball" },
    label: "BALL",
  },
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

  shiftY({
    id: "plate-gate-1",
    x: 805,
    y: 8770,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player", color: "#5b8fd9" },
    count: { mode: "exact", value: 3 },
  }),
  shiftY({
    id: "plate-gate-2",
    x: 955,
    y: 8770,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player", color: "#8b5a3c" },
    count: { mode: "exact", value: 1 },
  }),
  shiftY({
    id: "plate-gate-3",
    x: 1105,
    y: 8770,
    width: 100,
    height: 100,
    doorIds: ["0"],
    filter: { entityKind: "player" },
    count: { mode: "atLeast", value: 1 },
  }),
  shiftY({
    id: "plate-colour-inside",
    x: 370,
    y: 9160,
    width: 100,
    height: 120,
    doorIds: ["colour"],
    count: { mode: "atLeast", value: 1 },
  }),
  shiftY({
    id: "plate-colour-outside",
    x: 570,
    y: 9160,
    width: 100,
    height: 120,
    doorIds: ["colour"],
    count: { mode: "atLeast", value: 1 },
  }),
  shiftY({
    id: "plate-practice-1",
    x: 1370,
    y: 8990,
    width: 110,
    height: 110,
    doorIds: ["practice"],
    count: { mode: "atLeast", value: 1 },
  }),
  shiftY({
    id: "plate-practice-2",
    x: 1370,
    y: 9340,
    width: 110,
    height: 110,
    doorIds: ["practice"],
    count: { mode: "atLeast", value: 1 },
  }),
];

export const TRASH_PLATE_ID = "plate-trash";
export const TRASH_DOOR_ID = "2";

export const ELECTRIC_SOURCES: Rect[] = [END_POWER_SOURCE];
export const ELECTRIC_LINK_RANGE = 70;

export const DOOR_RECTS: Record<string, Rect> = Object.fromEntries(
  DOORS.map((door) => [door.id, door]),
);
export const DOOR_IDS = DOORS.map((door) => door.id);

export const COLOR_STATIONS: ColorStation[] = [
  shiftY({ color: "#c4553f", label: "RED", x: 100, y: 8820, width: 70, height: 70 }),
  shiftY({ color: "#5bbf6a", label: "GREEN", x: 215, y: 8820, width: 70, height: 70 }),
  shiftY({ color: "#5b8fd9", label: "BLUE", x: 330, y: 8820, width: 70, height: 70 }),
  shiftY({ color: "#e5b83f", label: "YELLOW", x: 100, y: 8930, width: 70, height: 70 }),
  shiftY({ color: "#9567c6", label: "PURPLE", x: 215, y: 8930, width: 70, height: 70 }),
  shiftY({ color: "#8b5a3c", label: "BROWN", x: 330, y: 8930, width: 70, height: 70 }),
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
  const zones: LavaZone[] = [];

  for (let sector = 0; sector < MAZE_ROWS / MAZE_SECTOR_ROWS; sector++) {
    const { hWalls, vWalls } = carveMaze(MAZE_COLS, MAZE_SECTOR_ROWS, MAZE_SEED + sector * 101);
    const rowOffset = sector * MAZE_SECTOR_ROWS;
    for (let r = 0; r < MAZE_SECTOR_ROWS - 1; r++) {
      for (let c = 0; c < MAZE_COLS; c++) {
        if (!hWalls[r][c]) continue;
        zones.push({
          x: MAZE_LEFT + c * MAZE_CELL_WIDTH,
          y: MAZE_TOP + (rowOffset + r + 1) * MAZE_CELL_HEIGHT - MAZE_WALL_THICKNESS / 2,
          width: MAZE_CELL_WIDTH,
          height: MAZE_WALL_THICKNESS,
          teleportTo: MAZE_ENTRANCE,
        });
      }
    }
    for (let r = 0; r < MAZE_SECTOR_ROWS; r++) {
      for (let c = 0; c < MAZE_COLS - 1; c++) {
        if (!vWalls[r][c]) continue;
        zones.push({
          x: MAZE_LEFT + (c + 1) * MAZE_CELL_WIDTH - MAZE_WALL_THICKNESS / 2,
          y: MAZE_TOP + (rowOffset + r) * MAZE_CELL_HEIGHT,
          width: MAZE_WALL_THICKNESS,
          height: MAZE_CELL_HEIGHT,
          teleportTo: MAZE_ENTRANCE,
        });
      }
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
    direction: (i * 41) % 9 === 0 ? "leftToRight" : "rightToLeft",
    startOffset: (i * 613) % MOVING_WALL_CYCLE,
    teleportTo: MOVING_ROOM_ENTRANCE,
  }),
);

export const FOOTBALL_PITCH: Rect = shiftY({ x: 90, y: 9440, width: 360, height: 840 });

export interface Slide {
  id: string;
  entry: Rect;
  path: Array<{ x: number; y: number }>;
  speed?: number;
  acceleration?: number;
  launchSpeed?: number;
}

export const SLIDES: Slide[] = [
  {
    id: "slide-lobby-to-practice",
    entry: shiftY({ x: 900, y: 10070, width: 170, height: 170 }),
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
    ].map(shiftY),
    speed: 1000,
    acceleration: 900,
    launchSpeed: 4000,
  },
];

export const WORLD_TEXTS: WorldText[] = [
  { x: 1000, y: -510, text: "you found the cheese.", size: 48, rotation: -1 },
  { x: 1000, y: -390, text: "thank you for playin the prototype", size: 30, rotation: 1 },
  { x: 1000, y: -300, text: "adamd  -  Norbiros  -  MrPOP  -  TheTwoBoom", size: 27 },
  { x: 1000, y: 260, text: "left-click anything suspicious", size: 26, rotation: -1 },
  shiftY({
    x: 1740,
    y: 9340,
    text: "complete the circuit with your bodies",
    size: 20,
    rotation: -1,
  }),
  shiftY({
    x: 1740,
    y: 9370,
    text: "connect the electricity to the *hackclub campfire* with your bodies",
    size: 16,
    rotation: -1,
  }),
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
  shiftY({ x: 1000, y: 8690, text: "the cheese is a lie.", size: 48, rotation: -2 }),
  {
    x: 1000,
    y: MAZE_BOTTOM - 55,
    text: "SECTOR D  /  find the marked ball",
    size: 25,
    rotation: -1,
  },
  { x: MAZE_GATE_C_X + MAZE_GATE_WIDTH / 2, y: MAZE_GATE_C_Y + 52, text: "GATE C", size: 23 },
  { x: MAZE_GATE_B_X + 100, y: MAZE_GATE_B_Y + 52, text: "GATE B", size: 23, rotation: 1 },
  { x: MAZE_GATE_A_X + 100, y: MAZE_GATE_A_Y + 52, text: "GATE A", size: 23, rotation: -1 },
  { x: 1000, y: MAZE_TOP + 210, text: "EXIT LOCK: bring the ball from sector D", size: 25 },
  shiftY({
    x: 1005,
    y: 8905,
    text: "you need 5+ mice to play the game!",
    size: 22,
    rotation: -1,
  }),
  shiftY({ x: 1120, y: 9920, text: "look! a droga szybkiego ruchu!", size: 24, rotation: 2 }),
  shiftY({ x: 270, y: 9920, text: "try using the right mouse button", size: 24, rotation: 2 }),
  shiftY({ x: 270, y: 8820, text: "pick a colour", size: 28, rotation: -3 }),
  shiftY({
    x: 1100,
    y: 9090,
    text: "try the pressure plates here. nothing bad happens.",
    size: 22,
    rotation: 1,
  }),
  shiftY({ x: 1750, y: 8770, text: "no cheese in here :((", size: 24, rotation: -2 }),
  shiftY({ x: 1000, y: 9580, text: "you - are - a - mouse", size: 22, rotation: 2 }),
  shiftY({
    x: 1000,
    y: 9670,
    text: "try to push this around while you wait for others v",
    size: 20,
    rotation: -1,
  }),
];

export interface DecorDef {
  sprite: string;
  x: number;
  y: number;
  size?: number;
  rotation?: number;
}

export type InteractivePropKind = "barrel" | "chest" | "trapdoor";

export interface InteractivePropDef extends Rect {
  id: string;
  kind: InteractivePropKind;
  label: string;
  rotation?: number;
}

// Small cursor toys live inside the actual course, not only in the waiting lobby.
export const INTERACTIVE_PROPS: InteractivePropDef[] = [];

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
  { sprite: "chest", x: 1650, y: 9770, size: 75, rotation: -4 },
  { sprite: "tree", x: 1850, y: 9920, size: 85, rotation: 0 },
  { sprite: "puddle", x: 1700, y: 10070, size: 105, rotation: 0 },
  { sprite: "barrels", x: 1850, y: 10170, size: 80, rotation: -6 },
].map(shiftY);

export const CHEESE = { x: MAP_WIDTH / 2, y: -445, size: 96 };

export const END_CREDITS_GITHUB = { x: 810, y: -180, width: 380, height: 72 };
export const GITHUB_URL = "https://github.com/Zerya-Dev/cursorgame/";

export interface ButtonDef extends Rect {}

export const BUTTON: ButtonDef = {
  x: MAP_WIDTH / 2 - 110,
  y: ROOM_TOP + ROOM_HEIGHT / 2 - 70,
  width: 220,
  height: 140,
};

export const BUTTON_CLICKS_PER_PLAYER = 25;
export const BUTTON_MIN_CLICK_TARGET = 20;

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
  shiftY({ kind: "ball", id: "ball-main", x: 1000, y: 9770, radius: 46, color: "#e0e0e0" }),
  {
    kind: "ball",
    id: "ball-maze-key",
    x: MAZE_LEFT + MAZE_CELL_WIDTH / 2,
    y: MAZE_BOTTOM - MAZE_CELL_HEIGHT / 2,
    radius: 42,
    color: "#e5b83f",
  },
];
