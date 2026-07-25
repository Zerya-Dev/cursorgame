export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Sweep {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  vx: number;
  vy: number;
}

export function circleOverlapsRect(cx: number, cy: number, radius: number, rect: Rect): boolean {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  return (cx - closestX) ** 2 + (cy - closestY) ** 2 < radius * radius;
}

export function sweptCircleHit(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  cx: number,
  cy: number,
  minDist: number,
): { normalX: number; normalY: number } | null {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const fx = fromX - cx;
  const fy = fromY - cy;
  const a = dx * dx + dy * dy;
  const c = fx * fx + fy * fy - minDist * minDist;

  let t = 0;
  if (c > 0) {
    if (a < 0.0001) return null;
    const b = 2 * (fx * dx + fy * dy);
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t < 0 || t > 1) return null;
  }

  const contactX = fromX + dx * t;
  const contactY = fromY + dy * t;
  let normalX = cx - contactX;
  let normalY = cy - contactY;
  const length = Math.hypot(normalX, normalY);
  if (length > 0.0001) {
    normalX /= length;
    normalY /= length;
  } else if (a > 0.0001) {
    const moveLength = Math.sqrt(a);
    normalX = -dy / moveLength;
    normalY = dx / moveLength;
  } else {
    normalX = 1;
    normalY = 0;
  }
  return { normalX, normalY };
}

export function pushCircleOutOfPoint(
  circle: { x: number; y: number },
  x: number,
  y: number,
  minDist: number,
): void {
  const dx = circle.x - x;
  const dy = circle.y - y;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minDist * minDist) return;
  if (distSq < 0.0001) {
    circle.x = x + minDist;
    return;
  }
  const dist = Math.sqrt(distSq);
  circle.x += (dx / dist) * (minDist - dist);
  circle.y += (dy / dist) * (minDist - dist);
}

export function applySweepPush(
  body: CircleBody,
  sweep: Sweep,
  pusherRadius: number,
  transfer: number,
): void {
  const minDist = pusherRadius + body.radius;
  const hit = sweptCircleHit(
    sweep.fromX,
    sweep.fromY,
    sweep.toX,
    sweep.toY,
    body.x,
    body.y,
    minDist,
  );
  if (!hit) return;

  const approachSpeed = (sweep.vx - body.vx) * hit.normalX + (sweep.vy - body.vy) * hit.normalY;
  if (approachSpeed > 0) {
    body.vx += hit.normalX * approachSpeed * transfer;
    body.vy += hit.normalY * approachSpeed * transfer;
  }

  pushCircleOutOfPoint(body, sweep.toX, sweep.toY, minDist);
}

export function applyFriction(
  body: { vx: number; vy: number },
  friction: number,
  dt: number,
): void {
  const decay = Math.exp(-friction * dt);
  body.vx *= decay;
  body.vy *= decay;
}

export function collideCircles(a: CircleBody, b: CircleBody, restitution: number): void {
  const minDist = a.radius + b.radius;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minDist * minDist) return;

  const dist = Math.sqrt(distSq);
  const normalX = dist > 0.0001 ? dx / dist : 1;
  const normalY = dist > 0.0001 ? dy / dist : 0;
  const overlap = minDist - dist;

  a.x -= normalX * overlap * 0.5;
  a.y -= normalY * overlap * 0.5;
  b.x += normalX * overlap * 0.5;
  b.y += normalY * overlap * 0.5;

  const approach = (a.vx - b.vx) * normalX + (a.vy - b.vy) * normalY;
  if (approach > 0) {
    const impulse = (approach * (1 + restitution)) / 2;
    a.vx -= normalX * impulse;
    a.vy -= normalY * impulse;
    b.vx += normalX * impulse;
    b.vy += normalY * impulse;
  }
}

export function clampSpeed(body: CircleBody, maxSpeed: number): void {
  const speed = Math.hypot(body.vx, body.vy);
  if (speed > maxSpeed) {
    body.vx = (body.vx / speed) * maxSpeed;
    body.vy = (body.vy / speed) * maxSpeed;
  }
}

export function moveCircle(
  body: CircleBody,
  dx: number,
  dy: number,
  solids: readonly Rect[],
  restitution: number,
): void {
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (body.radius * 0.5)));
  for (let i = 0; i < steps; i++) {
    body.x += dx / steps;
    body.y += dy / steps;
    for (const solid of solids) resolveCircleRect(body, solid, restitution);
  }
}

export function integrateCircle(
  body: CircleBody,
  dt: number,
  solids: readonly Rect[],
  restitution: number,
): void {
  moveCircle(body, body.vx * dt, body.vy * dt, solids, restitution);
}

export function resolveCircleRect(body: CircleBody, rect: Rect, restitution: number): void {
  const closestX = Math.max(rect.x, Math.min(body.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(body.y, rect.y + rect.height));
  const dx = body.x - closestX;
  const dy = body.y - closestY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= body.radius * body.radius) return;

  let normalX = 0;
  let normalY = 0;
  if (distSq > 0.0001) {
    const dist = Math.sqrt(distSq);
    const push = body.radius - dist;
    normalX = dx / dist;
    normalY = dy / dist;
    body.x += normalX * push;
    body.y += normalY * push;
  } else {
    const left = body.x - rect.x;
    const right = rect.x + rect.width - body.x;
    const top = body.y - rect.y;
    const bottom = rect.y + rect.height - body.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) {
      body.x = rect.x - body.radius;
      normalX = -1;
    } else if (min === right) {
      body.x = rect.x + rect.width + body.radius;
      normalX = 1;
    } else if (min === top) {
      body.y = rect.y - body.radius;
      normalY = -1;
    } else {
      body.y = rect.y + rect.height + body.radius;
      normalY = 1;
    }
  }

  const intoWall = body.vx * normalX + body.vy * normalY;
  if (intoWall < 0) {
    body.vx -= normalX * intoWall * (1 + restitution);
    body.vy -= normalY * intoWall * (1 + restitution);
  }
}
