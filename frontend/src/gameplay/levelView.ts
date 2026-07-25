import Phaser from "phaser";
import { WORLD_HEIGHT, WORLD_WIDTH } from "@shared";
import { BUTTON, COLOR_STATIONS, DOORS, OBSTACLES, PLATES, plateCountLabel } from "@shared";
import type { Door, PressurePlate } from "@shared";
import { parseColor } from "./color";

const PLATE_IDLE_STROKE = 0x9a6a2a;
const PLATE_ACTIVE_STROKE = 0x4ade80;
const PLATE_IDLE_TEXT = "#9a6a2a";
const PLATE_ACTIVE_TEXT = "#4ade80";

function plateIcon(entityKind?: string): string {
  if (entityKind === "player") return "ppl";
  if (entityKind === "ball") return "ballz here";
  if (entityKind === "boulder") return "boulders only";
  return "everyone!";
}

export interface DoorRuntime {
  def: Door;
  solid: boolean;
  open: boolean;
  rect: Phaser.GameObjects.Rectangle;
}

export function animateDoor(scene: Phaser.Scene, runtime: DoorRuntime, opening: boolean) {
  scene.tweens.killTweensOf(runtime.rect);
  scene.tweens.add({
    targets: runtime.rect,
    scaleY: opening ? 0.06 : 1,
    alpha: opening ? 0.18 : 1,
    duration: 320,
    ease: opening ? "Cubic.easeIn" : "Cubic.easeOut",
  });
}

export interface PlateRuntime {
  def: PressurePlate;
  active: boolean;
  rect: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Text;
  countLabel: Phaser.GameObjects.Text;
}

export function animatePlate(scene: Phaser.Scene, runtime: PlateRuntime, active: boolean) {
  const stroke = active ? PLATE_ACTIVE_STROKE : PLATE_IDLE_STROKE;
  const text = active ? PLATE_ACTIVE_TEXT : PLATE_IDLE_TEXT;
  runtime.rect.setStrokeStyle(3, stroke);
  runtime.rect.setFillStyle(stroke, active ? 0.15 : 0);
  if (!runtime.def.filter?.color) runtime.icon.setColor(text);
  runtime.countLabel.setColor(text);
  scene.tweens.killTweensOf([runtime.rect, runtime.icon]);
  scene.tweens.add({
    targets: [runtime.rect, runtime.icon],
    scaleX: 1.12,
    scaleY: 1.12,
    duration: 140,
    yoyo: true,
    ease: "Quad.easeOut",
  });
}

const BUTTON_STAGES = [
  { label: "DO YOU WANT TO PRESS?", fill: 0xc94f4f },
  { label: "I WOULDN'T DO THAT", fill: 0xd97706 },
  { label: "CLEANUP THIS MESS", fill: 0x4b5563 },
];

export interface ButtonRuntime {
  stage: number;
  rect: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  pressTween?: Phaser.Tweens.Tween;
}

export function buildButton(scene: Phaser.Scene): ButtonRuntime {
  const centerX = BUTTON.x + BUTTON.width / 2;
  const centerY = BUTTON.y + BUTTON.height / 2;

  const rect = scene.add
    .rectangle(centerX, centerY, BUTTON.width, BUTTON.height, BUTTON_STAGES[0].fill, 1)
    .setOrigin(0.5)
    .setStrokeStyle(4, 0xffffff, 0.4)
    .setDepth(5);

  const label = scene.add
    .text(centerX, centerY, BUTTON_STAGES[0].label, {
      fontFamily: "monospace",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: BUTTON.width - 24 },
    })
    .setOrigin(0.5)
    .setDepth(6);

  return { stage: -1, rect, label };
}

export function animateButtonPress(scene: Phaser.Scene, runtime: ButtonRuntime) {
  runtime.pressTween?.remove();
  runtime.rect.setScale(1);
  runtime.label.setScale(1);
  runtime.pressTween = scene.tweens.add({
    targets: [runtime.rect, runtime.label],
    scaleX: 0.92,
    scaleY: 0.88,
    duration: 90,
    yoyo: true,
    ease: "Quad.easeOut",
  });
}

export function updateButtonView(runtime: ButtonRuntime, stage: number) {
  if (runtime.stage === stage) return;
  runtime.stage = stage;
  const { label, fill } = BUTTON_STAGES[stage] ?? BUTTON_STAGES[BUTTON_STAGES.length - 1];
  runtime.label.setText(label);
  runtime.rect.setFillStyle(fill, 1);
}

export function drawLevel(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.setDepth(0);

  g.fillStyle(0x1b2647, 1);
  g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  for (const o of OBSTACLES) {
    g.fillStyle(0x3a4a6e, 1);
    g.fillRect(o.x, o.y, o.width, o.height);
    g.strokeRect(o.x, o.y, o.width, o.height);
  }
}

export function buildInteractables(scene: Phaser.Scene) {
  const plates: PlateRuntime[] = PLATES.map((def) => {
    const rect = scene.add
      .rectangle(def.x, def.y, def.width, def.height, PLATE_IDLE_STROKE, 0)
      .setOrigin(0, 0)
      .setStrokeStyle(3, PLATE_IDLE_STROKE)
      .setDepth(1);

    const icon = scene.add
      .text(
        def.x + def.width / 2,
        def.y + def.height / 2 - 6,
        def.label ?? plateIcon(def.filter?.entityKind),
        {
          fontFamily: "monospace",
          fontSize: def.label ? "20px" : "34px",
          color: def.filter?.color ?? PLATE_IDLE_TEXT,
        },
      )
      .setOrigin(0.5)
      .setDepth(2);

    const countLabel = scene.add
      .text(def.x + def.width / 2, def.y + def.height - 10, plateCountLabel(def.count), {
        fontFamily: "monospace",
        fontSize: "11px",
        color: PLATE_IDLE_TEXT,
      })
      .setOrigin(0.5, 1)
      .setDepth(2);

    return { def, active: false, rect, icon, countLabel };
  });

  const doors: DoorRuntime[] = DOORS.map((def) => ({
    def,
    solid: true,
    open: false,
    rect: scene.add
      .rectangle(def.x, def.y, def.width, def.height, 0xc94f4f)
      .setOrigin(0, 0)
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
