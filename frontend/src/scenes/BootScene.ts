import Phaser from "phaser";
import { PAPER_CSS } from "../gameplay/palette";

/** Kenney Scribble Dungeons tiles, vendored under public/assets/scribble. */
const SCRIBBLE_TEXTURES = [
  // seamless crops of the pack art: the stock tiles.png leaves gaps where the
  // 2x2 grid repeats, and wall.png is a closed box that tiles into a ladder
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

    // Two layers: the body is white so setTint can colour it per player, the
    // linework stays untinted on top.
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
    // Phaser measures text at creation time, so the webfont has to be resident
    // before GameScene builds any labels or they all bake in the fallback face.
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
    } catch {
      // fallback face in palette.ts FONT_HAND covers this
    }
  }
}
