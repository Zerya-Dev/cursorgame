import Phaser from "phaser";
import type { Obstacle } from "../level";

function resolveCircleVsRect(
  cursor: { x: number; y: number },
  velocity: Phaser.Math.Vector2,
  radius: number,
  rect: Obstacle,
) {
  const closestX = Phaser.Math.Clamp(cursor.x, rect.x, rect.x + rect.width);
  const closestY = Phaser.Math.Clamp(cursor.y, rect.y, rect.y + rect.height);

  const dx = cursor.x - closestX;
  const dy = cursor.y - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= radius * radius) return;

  let normalX = 0;
  let normalY = 0;

  if (distSq > 0.0001) {
    const dist = Math.sqrt(distSq);
    const push = radius - dist;
    normalX = dx / dist;
    normalY = dy / dist;
    cursor.x += normalX * push;
    cursor.y += normalY * push;
  } else {
    const left = cursor.x - rect.x;
    const right = rect.x + rect.width - cursor.x;
    const top = cursor.y - rect.y;
    const bottom = rect.y + rect.height - cursor.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) {
      cursor.x = rect.x - radius;
      normalX = -1;
    } else if (min === right) {
      cursor.x = rect.x + rect.width + radius;
      normalX = 1;
    } else if (min === top) {
      cursor.y = rect.y - radius;
      normalY = -1;
    } else {
      cursor.y = rect.y + rect.height + radius;
      normalY = 1;
    }
  }

  const intoWall = velocity.x * normalX + velocity.y * normalY;
  if (intoWall < 0) {
    velocity.x -= normalX * intoWall;
    velocity.y -= normalY * intoWall;
  }
}

export function moveAndCollide(
  cursor: { x: number; y: number },
  velocity: Phaser.Math.Vector2,
  radius: number,
  dx: number,
  dy: number,
  obstacles: Obstacle[],
) {
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (radius * 0.5)));
  for (let i = 0; i < steps; i++) {
    cursor.x += dx / steps;
    cursor.y += dy / steps;
    for (const rect of obstacles) resolveCircleVsRect(cursor, velocity, radius, rect);
  }
}
