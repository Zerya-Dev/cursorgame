import { WORLD_HEIGHT, WORLD_WIDTH } from "./config";

/** A solid, axis-aligned obstacle the cursor collides with. */
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

/**
 * A floor area that, while at least one occupant stands on it, keeps its linked
 * door(s) open. `doorIds` lists the doors this plate controls.
 */
export interface PressurePlate {
  x: number;
  y: number;
  width: number;
  height: number;
  doorIds: string[];
}

const T = 40; // default wall thickness

/**
 * A hand-authored level: free-form rooms and corridors placed by eye, not
 * snapped to a tile grid. Coordinates are in world space. Feel free to tweak
 * these by hand — the collision system doesn't care about alignment.
 */
export const OBSTACLES: Obstacle[] = [
  // --- Outer walls (keep the cursor inside the world) ---
  { x: 0, y: 0, width: WORLD_WIDTH, height: T }, // top
  { x: 0, y: WORLD_HEIGHT - T, width: WORLD_WIDTH, height: T }, // bottom
  { x: 0, y: 0, width: T, height: WORLD_HEIGHT }, // left
  { x: WORLD_WIDTH - T, y: 0, width: T, height: WORLD_HEIGHT }, // right

  // --- Top-left room: a partial wall with a doorway gap ---
  { x: 520, y: 300, width: T, height: 380 },
  { x: 520, y: 820, width: T, height: 300 },
  { x: 520, y: 300, width: 520, height: T },

  // --- A chunky central block you have to steer around ---
  { x: 1280, y: 760, width: 520, height: 360 },

  // --- Scattered pillars (varied sizes, off-grid on purpose) ---
  { x: 900, y: 1500, width: 160, height: 160 },
  { x: 2050, y: 430, width: 220, height: 90 },
  { x: 2380, y: 1250, width: 90, height: 520 },
  { x: 1650, y: 1780, width: 340, height: 120 },

  // --- Bottom-right chamber walls with an opening ---
  { x: 2500, y: 1500, width: T, height: 260 },
  { x: 2500, y: 1900, width: T, height: 340 },
  { x: 2500, y: 2200, width: 560, height: T },

  // --- A thin diagonal-ish staircase of blocks (broken up, non-uniform) ---
  { x: 260, y: 1400, width: 180, height: 70 },
  { x: 380, y: 1560, width: 180, height: 70 },
  { x: 500, y: 1720, width: 180, height: 70 },
];

/**
 * Doors fill the gaps left in the walls above. They block movement while
 * closed; a linked pressure plate opens them.
 */
export const DOORS: Door[] = [
  // Doorway in the top-left room wall (gap between the two vertical segments).
  { id: "door-room", x: 520, y: 680, width: T, height: 140 },
  // Entrance to the bottom-right chamber (gap in its left wall).
  { id: "door-chamber", x: 2500, y: 1760, width: T, height: 140 },
];

/**
 * Pressure plates. Stand on one to open the door(s) it controls. Each is placed
 * so the plate is reachable without first passing through the door it opens.
 */
export const PLATES: PressurePlate[] = [
  // Out in the open, opens the top-left room.
  { x: 760, y: 900, width: 110, height: 110, doorIds: ["door-room"] },
  // Near the central block, opens the bottom-right chamber.
  { x: 1980, y: 1360, width: 110, height: 110, doorIds: ["door-chamber"] },
];
