import Phaser from "phaser";
import { BallView } from "./BallView";
import type { Rect, Sweep } from "@shared";
import type { EntityState } from "../network/state";

/** Per-frame prediction inputs: local cursor sweep + currently solid rects. */
export interface PredictionContext {
  sweep: Sweep | null;
  solids: readonly Rect[];
}

export interface EntityView {
  syncFromServer(state: EntityState): void;
  update(dt: number, ctx: PredictionContext): void;
  destroy(): void;
}

type ViewFactory = (scene: Phaser.Scene, state: EntityState) => EntityView;

/** Register new entity kinds here; unknown kinds fall back to a plain ball. */
const VIEWS: Record<string, ViewFactory> = {
  ball: (scene, state) => new BallView(scene, state),
  boulder: (scene, state) => new BallView(scene, state),
};

export function createEntityView(scene: Phaser.Scene, state: EntityState): EntityView {
  const factory = VIEWS[state.kind] ?? VIEWS.ball;
  return factory(scene, state);
}
