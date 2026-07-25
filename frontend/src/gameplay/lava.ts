import Phaser from "phaser";
import type { LavaZone } from "../level";

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
