import Phaser from "phaser";
import { moveCircle } from "@shared";
import type { Rect } from "@shared";

export function moveAndCollide(
  cursor: { x: number; y: number },
  velocity: Phaser.Math.Vector2,
  radius: number,
  dx: number,
  dy: number,
  obstacles: readonly Rect[],
) {
  const body = { x: cursor.x, y: cursor.y, vx: velocity.x, vy: velocity.y, radius };
  moveCircle(body, dx, dy, obstacles, 0);
  cursor.x = body.x;
  cursor.y = body.y;
  velocity.set(body.vx, body.vy);
}
