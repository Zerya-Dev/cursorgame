import Phaser from "phaser";
import { SLIDES, circleOverlapsRect } from "@shared";
import type { Slide } from "@shared";
import { INK, PAPER } from "./palette";

/** fallback ride speed when a slide doesn't specify one, in world px/sec */
export const SLIDE_DEFAULT_SPEED = 900;
/** hard stop so a badly placed chute can never trap a player forever */
export const SLIDE_MAX_MS = 8000;

/** inner width of the chute, in world px */
const CHUTE = 54;
/** ink weight of the chute walls */
const CHUTE_WALL = 9;

export function findSlide(
  cursor: { x: number; y: number },
  radius: number,
  slides: Slide[] = SLIDES,
) {
  return slides.find((slide) => circleOverlapsRect(cursor.x, cursor.y, radius, slide.entry));
}

/**
 * Draws each chute as a tube: a thick ink stroke with a paper stroke laid over
 * it, so what shows is two hand-drawn walls with floor between them. Joints get
 * a disc each because Phaser's Graphics strokes use mitre joins, which spike
 * badly at the bends.
 */
export function buildSlides(scene: Phaser.Scene, depth: number) {
  for (const slide of SLIDES) {
    const points = slide.path;
    if (points.length < 2) continue;

    const walls = scene.add.graphics().setDepth(depth);
    walls.lineStyle(CHUTE + CHUTE_WALL * 2, INK, 1);
    strokePath(walls, points);
    for (const p of points) {
      walls.fillStyle(INK, 1);
      walls.fillCircle(p.x, p.y, (CHUTE + CHUTE_WALL * 2) / 2);
    }

    const floor = scene.add.graphics().setDepth(depth + 1);
    floor.lineStyle(CHUTE, PAPER, 1);
    strokePath(floor, points);
    for (const p of points) {
      floor.fillStyle(PAPER, 1);
      floor.fillCircle(p.x, p.y, CHUTE / 2);
    }

    // the mouth, so it's obvious where you get on
    const { entry } = slide;
    scene.add
      .rectangle(
        entry.x + entry.width / 2,
        entry.y + entry.height / 2,
        entry.width,
        entry.height,
        PAPER,
        1,
      )
      .setStrokeStyle(6, INK, 1)
      .setDepth(depth);
  }
}

function strokePath(g: Phaser.GameObjects.Graphics, points: Array<{ x: number; y: number }>) {
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
  g.strokePath();
}
