import Phaser from "phaser";

/**
 * Minimal boot scene. Add asset preloading here as the game grows, then hand
 * off to the main GameScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.scene.start("GameScene");
  }
}
