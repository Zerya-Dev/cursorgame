import Phaser from "phaser";

interface SprayBlob {
  x: number;
  y: number;
  radius: number;
  color: number;
  bornAt: number;
}

const FADE_MS = 6000;
const BASE_ALPHA = 0.55;

export class SprayLayer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly blobs: SprayBlob[] = [];

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(0.5);
  }

  spray(now: number, x: number, y: number, angle: number, color: number) {
    const dotCount = Phaser.Math.Between(2, 3);
    for (let i = 0; i < dotCount; i++) {
      const offsetAngle = angle + Phaser.Math.FloatBetween(-0.5, 0.5);
      const distance = Phaser.Math.FloatBetween(0, 14);
      this.blobs.push({
        x: x + Math.cos(offsetAngle) * distance,
        y: y + Math.sin(offsetAngle) * distance,
        radius: Phaser.Math.FloatBetween(4, 9),
        color,
        bornAt: now,
      });
    }
  }

  update(now: number) {
    while (this.blobs.length && now - this.blobs[0].bornAt > FADE_MS) {
      this.blobs.shift();
    }

    this.graphics.clear();
    for (const blob of this.blobs) {
      const alpha = BASE_ALPHA * (1 - (now - blob.bornAt) / FADE_MS);
      this.graphics.fillStyle(blob.color, alpha);
      this.graphics.fillCircle(blob.x, blob.y, blob.radius);
    }
  }
}
