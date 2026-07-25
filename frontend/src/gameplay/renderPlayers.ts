import Phaser from "phaser";
import type { RoomState } from "../network/state";
import { parseColor } from "./color";

interface RemotePlayer {
  cursor: Phaser.GameObjects.Arc;
  target: Phaser.Math.Vector2;
  trailAnchor: Phaser.Math.Vector2;
  color: number;
}

const INTERPOLATION_RATE = 14;
const SNAP_DISTANCE = 400;

export class RenderPlayers {
  private players = new Map<string, RemotePlayer>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly radius: number,
  ) {}

  sync(state: RoomState, localSessionId: string) {
    const active = new Set<string>();

    state.players.forEach((player, sessionId) => {
      if (sessionId === localSessionId) return;
      active.add(sessionId);

      const color = parseColor(player.color);
      let remote = this.players.get(sessionId);
      if (!remote) {
        const cursor = this.scene.add.circle(player.x, player.y, this.radius, color);
        cursor.setStrokeStyle(3, 0xffffff).setDepth(9);
        remote = {
          cursor,
          target: new Phaser.Math.Vector2(player.x, player.y),
          trailAnchor: new Phaser.Math.Vector2(player.x, player.y),
          color,
        };
        this.players.set(sessionId, remote);
      }
      remote.target.set(player.x, player.y);
      remote.color = color;
      remote.cursor.setFillStyle(color);
    });

    for (const [sessionId, remote] of this.players) {
      if (!active.has(sessionId)) {
        remote.cursor.destroy();
        this.players.delete(sessionId);
      }
    }
  }

  update(dt: number) {
    const interpolation = 1 - Math.exp(-INTERPOLATION_RATE * dt);
    for (const remote of this.players.values()) {
      const distance = Phaser.Math.Distance.Between(
        remote.cursor.x,
        remote.cursor.y,
        remote.target.x,
        remote.target.y,
      );
      if (distance > SNAP_DISTANCE) {
        remote.cursor.setPosition(remote.target.x, remote.target.y);
      } else {
        remote.cursor.x = Phaser.Math.Linear(remote.cursor.x, remote.target.x, interpolation);
        remote.cursor.y = Phaser.Math.Linear(remote.cursor.y, remote.target.y, interpolation);
      }
    }
  }

  clear() {
    for (const remote of this.players.values()) remote.cursor.destroy();
    this.players.clear();
  }
}
