import "@fontsource/patrick-hand";
import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./config";
import { PAPER_CSS } from "./gameplay/palette";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: PAPER_CSS,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  // This helps make SVGs and shapes look crisp on high-res screens
  antialias: true,
  disableContextMenu: true,
  scene: [BootScene, GameScene],
};

const game = new Phaser.Game(config);
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
