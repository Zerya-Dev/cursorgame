import Phaser from "phaser";
import type { ColorStation } from "../level";

export function parseColor(color: string): number {
  const parsed = Number.parseInt(color.replace(/^#/, ""), 16);
  return Number.isFinite(parsed) ? parsed : 0xffffff;
}

export function findColorStation(
  cursor: { x: number; y: number },
  radius: number,
  stations: ColorStation[],
): ColorStation | undefined {
  return stations.find((rect) => {
    const cx = Phaser.Math.Clamp(cursor.x, rect.x, rect.x + rect.width);
    const cy = Phaser.Math.Clamp(cursor.y, rect.y, rect.y + rect.height);
    return (cursor.x - cx) ** 2 + (cursor.y - cy) ** 2 < radius ** 2;
  });
}
