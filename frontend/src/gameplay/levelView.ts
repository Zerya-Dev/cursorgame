import Phaser from "phaser";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../config";
import { COLOR_STATIONS, DOORS, OBSTACLES, PLATES } from "../level";
import type { Door, PressurePlate } from "../level";
import { parseColor } from "./color";

export interface DoorRuntime {
  def: Door;
  solid: boolean;
  rect: Phaser.GameObjects.Rectangle;
}

export interface PlateRuntime {
  def: PressurePlate;
  active: boolean;
  rect: Phaser.GameObjects.Rectangle;
}

export function drawLevel(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.setDepth(0);

  g.fillStyle(0x1b2647, 1);
  g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  for (const o of OBSTACLES) {
    g.fillStyle(0x3a4a6e, 1);
    g.fillRect(o.x, o.y, o.width, o.height);
    g.lineStyle(2, 0x6a7aa0, 1);
    g.strokeRect(o.x, o.y, o.width, o.height);
  }
}

export function buildInteractables(scene: Phaser.Scene) {
  const plates: PlateRuntime[] = PLATES.map((def) => ({
    def,
    active: false,
    rect: scene.add
      .rectangle(def.x, def.y, def.width, def.height, 0x9a6a2a)
      .setOrigin(0, 0)
      .setStrokeStyle(3, 0xd8a24a)
      .setDepth(1),
  }));

  const doors: DoorRuntime[] = DOORS.map((def) => ({
    def,
    solid: true,
    rect: scene.add
      .rectangle(def.x, def.y, def.width, def.height, 0xc94f4f)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xe88)
      .setDepth(2),
  }));

  for (const station of COLOR_STATIONS) {
    scene.add
      .rectangle(
        station.x,
        station.y,
        station.width,
        station.height,
        parseColor(station.color),
        0.7,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(3, 0xffffff, 0.65)
      .setDepth(1);
    scene.add
      .text(station.x + station.width / 2, station.y + station.height + 8, station.label, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: station.color,
      })
      .setOrigin(0.5, 0)
      .setDepth(2);
  }

  return { doors, plates };
}
