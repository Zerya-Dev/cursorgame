import Phaser from "phaser";
import type { Rect } from "@shared";
import { ACCENT_SPARK } from "./palette";

function sparkTexture(scene: Phaser.Scene) {
  if (!scene.textures.exists("sparkDot")) {
    scene.add
      .graphics()
      .fillStyle(0xffffff)
      .fillCircle(2, 2, 2)
      .generateTexture("sparkDot", 4, 4)
      .destroy();
  }
  return "sparkDot";
}

function sparkEmitter(scene: Phaser.Scene, x: number, y: number) {
  return scene.add.particles(x, y, sparkTexture(scene), {
    tint: ACCENT_SPARK,
    blendMode: "ADD",
    speed: { min: 30, max: 90 },
    lifespan: { min: 150, max: 320 },
    scale: { start: 1.6, end: 0 },
    quantity: 1,
    frequency: 25,
  });
}

export function buildElectricSource(scene: Phaser.Scene, source: Rect) {
  sparkEmitter(scene, source.x + source.width / 2, source.y + source.height / 2).setDepth(1);
}

export function setElectrified(
  scene: Phaser.Scene,
  body: Phaser.GameObjects.Image,
  charged: boolean,
) {
  if (charged === (body.getData("charged") ?? false)) return;
  body.setData("charged", charged);
  let emitter = body.getData("sparks") as Phaser.GameObjects.Particles.ParticleEmitter | undefined;
  if (!charged) {
    emitter?.stop();
    return;
  }
  if (!emitter) {
    emitter = sparkEmitter(scene, body.x, body.y).setDepth(9).startFollow(body);
    body.setData("sparks", emitter);
  }
  emitter.start();
}
