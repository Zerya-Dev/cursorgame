import Phaser from "phaser";
import { PAPER_CSS } from "../gameplay/palette";

const SCRIBBLE_TEXTURES = [
  // a map for textures ig?
  "floor_cell",
  "wall_seam",
  "tiles_cracked",
  "tiles_decorative",
  "wall_corner",
  "trapdoor_square",
  "trapdoor_round",
  "barrel",
  "barrels",
  "crate",
  "crate_small",
  "chest",
  "table",
  "chair",
  "campfire",
  "plants",
  "puddle",
  "tree",
  "carpet",
  "stairs_down",
  "arrow",
  "path",
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.cameras.main.setBackgroundColor(PAPER_CSS);

    for (const key of SCRIBBLE_TEXTURES) {
      this.load.image(key, `assets/scribble/${key}.png`);
    }

    this.load.svg("mouseBody", "assets/scribble/mouse_body.svg", { width: 52, height: 52 });
    this.load.svg("mouseInk", "assets/scribble/mouse_ink.svg", { width: 52, height: 52 });
    this.load.svg("mouseInkClickLeft", "assets/scribble/mouse_ink_click_left.svg", {
      width: 52,
      height: 52,
    });
    this.load.svg("mouseInkClickRight", "assets/scribble/mouse_ink_click_right.svg", {
      width: 52,
      height: 52,
    });
    this.load.svg("cheese", "assets/scribble/cheese.svg", { width: 72, height: 72 });
    this.load.svg("doorLeaf", "assets/scribble/door_leaf.svg", { width: 128, height: 48 });
  }

  async create() {
    // TODO unused?
    await this.loadFonts();
    this.scene.start("GameScene");
  }

  private async loadFonts() {
    if (!document.fonts?.load) return;
    try {
      await Promise.all([
        document.fonts.load('16px "Patrick Hand"'),
        document.fonts.load('bold 16px "Patrick Hand"'),
      ]);
      await document.fonts.ready;
    } catch {}
  }
}
