import Phaser from "phaser";
import type { WorldText } from "@shared";

export function buildWorldTexts(scene: Phaser.Scene, texts: WorldText[]) {
  for (const t of texts) {
    scene.add
      .text(t.x, t.y, t.text, {
        fontFamily: "monospace",
        fontSize: `${t.size}px`,
        color: "#ffffff",
      })
      .setDepth(2);
  }
}
