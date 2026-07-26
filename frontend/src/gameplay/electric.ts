import Phaser from "phaser";
import type { Rect } from "@shared";
import { ACCENT_SPARK } from "./palette";

function drawBolt(scene: Phaser.Scene, x: number, y: number) {
  const angle =
    (Math.random() < 0.5 ? -1 : 1) * (Math.PI / 2) + Phaser.Math.FloatBetween(-0.5, 0.5);
  const length = Phaser.Math.Between(18, 32);
  const segments = 4;
  const bolt = scene.add.graphics().setPosition(x, y).setDepth(20).lineStyle(3, ACCENT_SPARK, 1);
  bolt.beginPath();
  bolt.moveTo(0, 0);
  for (let i = 1; i <= segments; i++) {
    const along = (length * i) / segments;
    const across = i === segments ? 0 : Phaser.Math.Between(-7, 7);
    bolt.lineTo(
      Math.cos(angle) * along - Math.sin(angle) * across,
      Math.sin(angle) * along + Math.cos(angle) * across,
    );
  }
  bolt.strokePath();
  scene.tweens.add({ targets: bolt, alpha: 0, duration: 160, onComplete: () => bolt.destroy() });
}

function sparkLoop(scene: Phaser.Scene, getPos: () => { x: number; y: number } | null) {
  const timer = scene.time.addEvent({
    delay: 70,
    loop: true,
    callback: () => {
      const pos = getPos();
      if (!pos) return timer.remove();
      drawBolt(scene, pos.x, pos.y);
    },
  });
  return timer;
}

export function buildElectricSource(scene: Phaser.Scene, source: Rect) {
  const cx = source.x + source.width / 2;
  const cy = source.y + source.height / 2;
  sparkLoop(scene, () => ({ x: cx, y: cy }));
}

export function setElectrified(
  scene: Phaser.Scene,
  body: Phaser.GameObjects.Image,
  charged: boolean,
) {
  if (charged === (body.getData("charged") ?? false)) return;
  body.setData("charged", charged);
  if (!charged) {
    (body.getData("sparks") as Phaser.Time.TimerEvent | undefined)?.remove();
    return;
  }
  body.setData(
    "sparks",
    sparkLoop(scene, () => (body.isDestroyed ? null : { x: body.x, y: body.y })),
  );
}
