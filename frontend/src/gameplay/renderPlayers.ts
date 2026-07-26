import Phaser from "phaser";
import { ANGLE_SCALE } from "@shared";
import type { RoomState } from "../network/state";
import { parseColor } from "./color";
import { setElectrified } from "./electric";

interface RemotePlayer {
  cursor: Phaser.GameObjects.Image;
  ink: Phaser.GameObjects.Image;
  target: Phaser.Math.Vector2;
  trailAnchor: Phaser.Math.Vector2;
  color: number;
  heading: number;
}

const INTERPOLATION_RATE = 14;
const SNAP_DISTANCE = 400;

export class RenderPlayers {
  private players = new Map<string, RemotePlayer>();

  constructor(private readonly scene: Phaser.Scene) {}

  sync(state: RoomState, localSessionId: string) {
    const active = new Set<string>();

    state.players.forEach((player, sessionId) => {
      if (sessionId === localSessionId) return;
      // Dropped players linger in the state during their reconnection grace
      // period; hide the frozen body until they actually come back.
      if (!player.connected) return;
      active.add(sessionId);

      const color = parseColor(player.color);
      let remote = this.players.get(sessionId);
      if (!remote) {
        const cursor = this.scene.add
          .image(player.x, player.y, "mouseBody")
          .setTint(color)
          .setDepth(7);
        const ink = this.scene.add.image(player.x, player.y, "mouseInk").setDepth(8);
        remote = {
          cursor,
          ink,
          target: new Phaser.Math.Vector2(player.x, player.y),
          trailAnchor: new Phaser.Math.Vector2(player.x, player.y),
          color,
          heading: 0,
        };
        this.players.set(sessionId, remote);
      }
      remote.target.set(player.x, player.y);
      remote.heading = player.angle / ANGLE_SCALE + Math.PI / 2;
      remote.color = color;
      remote.cursor.setTint(color);
      setElectrified(this.scene, remote.cursor, player.charged);
    });

    for (const [sessionId, remote] of this.players) {
      if (!active.has(sessionId)) {
        remote.cursor.destroy();
        remote.ink.destroy();
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

      remote.cursor.setRotation(remote.heading);
      remote.ink.setPosition(remote.cursor.x, remote.cursor.y).setRotation(remote.heading);
    }
  }

  clear() {
    for (const remote of this.players.values()) {
      remote.cursor.destroy();
      remote.ink.destroy();
    }
    this.players.clear();
  }
}
