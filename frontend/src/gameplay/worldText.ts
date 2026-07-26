import Phaser from "phaser";
import type { WorldText } from "@shared";
import { FONT_HAND, INK_CSS } from "./palette";

export function buildWorldTexts(scene: Phaser.Scene, texts: WorldText[]) {
  for (const t of texts) {
    scene.add
      .text(t.x, t.y, t.text, {
        fontFamily: FONT_HAND,
        fontSize: `${t.size}px`,
        color: INK_CSS,
      })
      .setOrigin(0.5)
      .setRotation(Phaser.Math.DegToRad(t.rotation ?? -2))
      .setDepth(2);
  }
}
