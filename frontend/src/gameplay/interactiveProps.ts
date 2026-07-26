import Phaser from "phaser";
import { INTERACTIVE_PROPS } from "@shared";
import type { InteractivePropDef } from "@shared";
import { ACCENT_DANGER, FONT_HAND, INK_CSS } from "./palette";

export interface InteractivePropRuntime {
  def: InteractivePropDef;
  image: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  status: number;
}

export function buildInteractiveProps(scene: Phaser.Scene) {
  return INTERACTIVE_PROPS.map((def): InteractivePropRuntime => {
    const texture = def.kind === "trapdoor" ? "trapdoor_round" : def.kind;
    const image = scene.add
      .image(def.x + def.width / 2, def.y + def.height / 2, texture)
      .setDisplaySize(def.width, def.height)
      .setRotation(Phaser.Math.DegToRad(def.rotation ?? 0))
      .setDepth(3);
    const label = scene.add
      .text(image.x, def.y - 8, def.label, {
        fontFamily: FONT_HAND,
        fontSize: "18px",
        color: INK_CSS,
      })
      .setOrigin(0.5, 1)
      .setDepth(4);
    return { def, image, label, status: -1 };
  });
}

export function updateInteractiveProp(runtime: InteractivePropRuntime, status: number) {
  if (runtime.status === status) return;
  runtime.status = status;
  const { label } = runtime.def;
  runtime.image
    .setVisible(true)
    .clearTint()
    .setScale(status === 1 ? 0.92 : 1)
    .setAlpha(status === 1 ? 0.38 : 1);
  runtime.label.setText(status === 1 ? "" : label);
}

export function playInteractivePropEffect(
  scene: Phaser.Scene,
  runtime: InteractivePropRuntime,
  action: string,
) {
  scene.tweens.killTweensOf(runtime.image);
  if (action === "explode") {
    playExplosion(scene, runtime.image.x, runtime.image.y);
    return;
  }
  scene.tweens.add({
    targets: runtime.image,
    scaleX: action === "reveal" ? 1.08 : 0.82,
    scaleY: action === "reveal" ? 1.08 : 0.82,
    angle: runtime.image.angle + (action === "reveal" ? 8 : -8),
    duration: 120,
    yoyo: true,
    ease: "Back.easeOut",
  });
}

export function playExplosion(scene: Phaser.Scene, x: number, y: number) {
  for (let i = 0; i < 14; i++) {
    const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.25;
    const spark = scene.add
      .circle(x, y, 5 + Math.random() * 8, i % 2 ? 0xf2c14e : ACCENT_DANGER)
      .setDepth(8);
    scene.tweens.add({
      targets: spark,
      x: spark.x + Math.cos(angle) * (70 + Math.random() * 90),
      y: spark.y + Math.sin(angle) * (70 + Math.random() * 90),
      alpha: 0,
      scale: 0.2,
      duration: 450 + Math.random() * 250,
      ease: "Quad.easeOut",
      onComplete: () => spark.destroy(),
    });
  }
  scene.cameras.main.shake(180, 0.006);
}
