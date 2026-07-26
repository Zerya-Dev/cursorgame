import Phaser from "phaser";
import type { Rect } from "@shared";
import { ACCENT_SPARK, INK } from "./palette";

export function buildElectricSource(scene: Phaser.Scene, source: Rect) {
  const cx = source.x + source.width / 2;
  const cy = source.y + source.height / 2;
  const dot = scene.add
    .circle(cx, cy, Math.min(source.width, source.height) / 2, ACCENT_SPARK, 0.85)
    .setStrokeStyle(4, INK, 1)
    .setDepth(1);
  scene.tweens.add({
    targets: dot,
    alpha: 0.35,
    duration: 260,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
}

export function setElectrified(
  scene: Phaser.Scene,
  body: Phaser.GameObjects.Image,
  ink: Phaser.GameObjects.Image,
  baseColor: number,
  charged: boolean,
) {
  if (charged === (body.getData("charged") ?? false)) return;
  body.setData("charged", charged);
  scene.tweens.killTweensOf([body, ink]);
  if (!charged) {
    body.setScale(1).setTint(baseColor);
    ink.setScale(1);
    return;
  }
  scene.tweens.add({
    targets: [body, ink],
    scaleX: 1.15,
    scaleY: 0.88,
    duration: 60 + Math.random() * 40,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
    onUpdate: () => body.setTint(Math.random() < 0.5 ? ACCENT_SPARK : baseColor),
  });
}
