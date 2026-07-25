import Phaser from "phaser";
import { movingWallSegments } from "@shared";
import type { LavaZone, MovingLavaWall, Rect } from "@shared";

/**
 * copied from color.ts a bit...
 */

export function buildLavaZones(scene: Phaser.Scene, zones: LavaZone[]) {
  for (const zone of zones) {
    scene.add
      .rectangle(zone.x, zone.y, zone.width, zone.height, 0xff0000, 0.85)
      .setOrigin(0, 0)
      .setDepth(1);
  }
}

export function findLavaZone(
  cursor: { x: number; y: number },
  radius: number,
  zones: LavaZone[],
): LavaZone | undefined {
  return zones.find((zone) => {
    const cx = Phaser.Math.Clamp(cursor.x, zone.x, zone.x + zone.width);
    const cy = Phaser.Math.Clamp(cursor.y, zone.y, zone.y + zone.height);
    return (cursor.x - cx) ** 2 + (cursor.y - cy) ** 2 < radius ** 2;
  });
}

export interface MovingWallRuntime {
  def: MovingLavaWall;
  rects: [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
}

export function buildMovingLavaWalls(
  scene: Phaser.Scene,
  walls: MovingLavaWall[],
): MovingWallRuntime[] {
  return walls.map((def) => ({
    def,
    rects: [
      scene.add.rectangle(0, 0, 0, 0, 0xff0000, 0.85).setOrigin(0, 0).setDepth(1),
      scene.add.rectangle(0, 0, 0, 0, 0xff0000, 0.85).setOrigin(0, 0).setDepth(1),
    ],
  }));
}

export function updateMovingLavaWalls(
  runtimes: MovingWallRuntime[],
  nowMs: number,
  roomLeft: number,
  roomRight: number,
) {
  for (const runtime of runtimes) {
    const segments = movingWallSegments(runtime.def, nowMs, roomLeft, roomRight);
    segments.forEach((segment: Rect, i) => {
      runtime.rects[i].setPosition(segment.x, segment.y).setSize(segment.width, segment.height);
    });
  }
}

export function findMovingLavaHit(
  cursor: { x: number; y: number },
  radius: number,
  walls: MovingLavaWall[],
  nowMs: number,
  roomLeft: number,
  roomRight: number,
): MovingLavaWall | undefined {
  return walls.find((wall) => {
    const segments = movingWallSegments(wall, nowMs, roomLeft, roomRight);
    return segments.some((segment) => {
      const cx = Phaser.Math.Clamp(cursor.x, segment.x, segment.x + segment.width);
      const cy = Phaser.Math.Clamp(cursor.y, segment.y, segment.y + segment.height);
      return (cursor.x - cx) ** 2 + (cursor.y - cy) ** 2 < radius ** 2;
    });
  });
}
