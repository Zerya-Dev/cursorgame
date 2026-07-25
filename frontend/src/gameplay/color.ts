import { circleOverlapsRect } from "@shared";
import type { ColorStation } from "@shared";

export function parseColor(color: string): number {
  const parsed = Number.parseInt(color.replace(/^#/, ""), 16);
  return Number.isFinite(parsed) ? parsed : 0xffffff;
}

export function findColorStation(
  cursor: { x: number; y: number },
  radius: number,
  stations: ColorStation[],
): ColorStation | undefined {
  return stations.find((station) => circleOverlapsRect(cursor.x, cursor.y, radius, station));
}
