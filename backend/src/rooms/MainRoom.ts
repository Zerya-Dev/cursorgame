import { Room, Client, CloseCode } from "colyseus";
import { MainRoomState } from "./schema/MainRoomState.js";
import { Door, Player, PressurePlate } from "./schema/GeneralSchemas.js";
import { World } from "../game/World.js";
import {
  COLOR_STATIONS,
  DOOR_IDS,
  PLATES,
  PLAYER_RADIUS,
  SPAWN_POINT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  circleOverlapsRect,
} from "@shared";
import type { Rect } from "@shared";

const DOOR_HOLD_MS = 1;
const TICK_MS = 20;

export class MainRoom extends Room {
  maxClients = 8;
  patchRate = 20;
  state = new MainRoomState();
  private doorOpenUntil = new Map<string, number>();
  private world = new World(this.state);

  messages = {
    move: (client: Client, message: { x?: unknown; y?: unknown }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || typeof message.x !== "number" || typeof message.y !== "number") return;
      if (!Number.isFinite(message.x) || !Number.isFinite(message.y)) return;
      player.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_WIDTH - PLAYER_RADIUS, message.x));
      player.y = Math.max(PLAYER_RADIUS, Math.min(WORLD_HEIGHT - PLAYER_RADIUS, message.y));
      const station = COLOR_STATIONS.find((candidate) => this.playerOverlaps(player, candidate));
      if (station) player.color = station.color;
      this.updateGameplay();
    },
    setColor: (client: Client, message: { color?: unknown }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || typeof message.color !== "string") return;
      const station = COLOR_STATIONS.find(({ color }) => color === message.color);
      if (station && this.playerOverlaps(player, station)) player.color = station.color;
    },
    spray: (
      client: Client,
      message: { x?: unknown; y?: unknown; angle?: unknown; color?: unknown },
    ) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const { x, y, angle, color } = message;
      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        typeof angle !== "number" ||
        typeof color !== "number" ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(angle) ||
        !Number.isFinite(color)
      ) {
        return;
      }
      this.broadcast(
        "spray",
        {
          x: Math.max(12, Math.min(3188, x)),
          y: Math.max(12, Math.min(2388, y)),
          angle,
          color: color & 0xffffff,
        },
        { except: client },
      );
    },
  };

  onCreate() {
    for (const id of DOOR_IDS) {
      const door = new Door();
      door.id = id;
      this.state.doors.set(id, door);
    }
    for (const definition of PLATES) {
      const plate = new PressurePlate();
      plate.id = definition.id;
      this.state.plates.set(definition.id, plate);
    }
    this.setSimulationInterval(() => {
      this.updateGameplay();
      this.world.update(TICK_MS / 1000);
    }, TICK_MS);
  }

  onJoin(client: Client) {
    const player = new Player();
    player.name = "TestPlayer_" + client.sessionId;
    player.x = SPAWN_POINT.x;
    player.y = SPAWN_POINT.y;
    this.state.players.set(client.sessionId, player);
    console.log(client.sessionId, "joined!");
  }

  onLeave(client: Client, code: CloseCode) {
    this.state.players.delete(client.sessionId);
    this.world.forgetPlayer(client.sessionId);
    this.updateGameplay();
    console.log(client.sessionId, "left!", code);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  private playerOverlaps(player: Player, rect: Rect) {
    return circleOverlapsRect(player.x, player.y, PLAYER_RADIUS, rect);
  }

  private plateIsPressed(definition: Rect) {
    for (const player of this.state.players.values()) {
      if (this.playerOverlaps(player, definition)) return true;
    }
    return this.world.pressesRect(definition);
  }

  private updateGameplay() {
    const now = Date.now();
    const heldDoors = new Set<string>();

    for (const definition of PLATES) {
      const active = this.plateIsPressed(definition);
      const plate = this.state.plates.get(definition.id);
      if (plate) plate.active = active;
      if (active) for (const doorId of definition.doorIds) heldDoors.add(doorId);
    }

    for (const doorId of DOOR_IDS) {
      if (heldDoors.has(doorId)) this.doorOpenUntil.set(doorId, now + DOOR_HOLD_MS);
      const door = this.state.doors.get(doorId);
      if (door) door.open = now < (this.doorOpenUntil.get(doorId) ?? 0);
    }
  }
}
