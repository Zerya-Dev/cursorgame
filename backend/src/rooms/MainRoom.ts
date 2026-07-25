import { Room, Client, CloseCode } from "colyseus";
import { Door, MainRoomState, Player, PressurePlate } from "./schema/MainRoomState.js";

const PLAYER_RADIUS = 12;
const DOOR_HOLD_MS = 1200;
const COLOR_STATIONS = [
  { color: "#4ade80", x: 1380, y: 1190, width: 70, height: 70 },
  { color: "#60a5fa", x: 1470, y: 1190, width: 70, height: 70 },
  { color: "#f472b6", x: 1760, y: 1190, width: 70, height: 70 },
  { color: "#facc15", x: 1850, y: 1190, width: 70, height: 70 },
];
const PLATES = [
  { id: "plate-room", x: 760, y: 900, width: 110, height: 110, doorIds: ["door-room"] },
  { id: "plate-chamber", x: 1980, y: 1360, width: 110, height: 110, doorIds: ["door-chamber"] },
];
const DOOR_IDS = ["door-room", "door-chamber"];

function overlapsRect(player: Player, rect: { x: number; y: number; width: number; height: number }) {
  const closestX = Math.max(rect.x, Math.min(player.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(player.y, rect.y + rect.height));
  return (player.x - closestX) ** 2 + (player.y - closestY) ** 2 < PLAYER_RADIUS ** 2;
}

export class MainRoom extends Room {
  maxClients = 500;
  state = new MainRoomState();
  private doorOpenUntil = new Map<string, number>();

  messages = {
    move: (client: Client, message: { x?: unknown; y?: unknown }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || typeof message.x !== "number" || typeof message.y !== "number") return;
      if (!Number.isFinite(message.x) || !Number.isFinite(message.y)) return;
      player.x = Math.max(12, Math.min(3188, message.x));
      player.y = Math.max(12, Math.min(2388, message.y));
      const station = COLOR_STATIONS.find((candidate) => overlapsRect(player, candidate));
      if (station) player.color = station.color;
      this.updateGameplay();
    },
    setColor: (client: Client, message: { color?: unknown }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || typeof message.color !== "string") return;
      const station = COLOR_STATIONS.find(({ color }) => color === message.color);
      if (station && overlapsRect(player, station)) player.color = station.color;
    },
  }

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
    this.setSimulationInterval(() => this.updateGameplay(), 100);
  }

  onJoin(client: Client) {
    const player = new Player();
    player.name = "TestPlayer_" + client.sessionId;
    this.state.players.set(client.sessionId, player);
    console.log(client.sessionId, "joined!");
  }

  onLeave(client: Client, code: CloseCode) {
    this.state.players.delete(client.sessionId);
    this.updateGameplay();
    console.log(client.sessionId, "left!", code);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  private updateGameplay() {
    const now = Date.now();
    const heldDoors = new Set<string>();

    for (const definition of PLATES) {
      const active = Array.from(this.state.players.values()).some((player) =>
        overlapsRect(player, definition),
      );
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
