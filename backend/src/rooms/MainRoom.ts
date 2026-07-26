import { Room, Client, CloseCode } from "colyseus";
import { MainRoomState } from "./schema/MainRoomState.js";
import { Door, Player, PressurePlate } from "./schema/GeneralSchemas.js";
import { World } from "../game/World.js";
import {
  BALL_SPAWN_COLORS,
  BALL_SPAWN_COUNT,
  BUTTON,
  BUTTON_CLICKS_PER_PLAYER,
  BUTTON_MIN_CLICK_TARGET,
  COLOR_STATIONS,
  DOOR_IDS,
  DOORS,
  ELECTRIC_LINK_RANGE,
  ELECTRIC_SOURCE,
  PLATES,
  PLAYER_RADIUS,
  SPAWN_POINT,
  TRASH_DOOR_ID,
  TRASH_PLATE_ID,
  WORLD_HEIGHT,
  WORLD_TOP,
  WORLD_WIDTH,
  circleOverlapsRect,
  evaluatePlate,
  occupantMatchesFilter,
} from "@shared";
import type { PlateOccupant, PressurePlate as PlateDef, Rect } from "@shared";

const PERMANENT_DOORS = new Set(DOORS.filter((door) => door.permanent).map((door) => door.id));

const trashPlateDef = PLATES.find((plate) => plate.id === TRASH_PLATE_ID);
if (!trashPlateDef) throw new Error(`Missing plate definition: ${TRASH_PLATE_ID}`);
const TRASH_PLATE: PlateDef = trashPlateDef;

const DOOR_HOLD_MS = 600;
const TICK_MS = 20;

export class MainRoom extends Room {
  maxClients = 40;
  patchRate = 20;
  state = new MainRoomState();
  private doorOpenUntil = new Map<string, number>();
  private unlockedDoors = new Set<string>();
  private world = new World(this.state);

  messages = {
    move: (client: Client, message: { x?: unknown; y?: unknown }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || typeof message.x !== "number" || typeof message.y !== "number") return;
      if (!Number.isFinite(message.x) || !Number.isFinite(message.y)) return;
      player.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_WIDTH - PLAYER_RADIUS, message.x));
      player.y = Math.max(
        WORLD_TOP + PLAYER_RADIUS,
        Math.min(WORLD_HEIGHT - PLAYER_RADIUS, message.y),
      );
      const station = COLOR_STATIONS.find((candidate) => this.playerOverlaps(player, candidate));
      if (station) player.color = station.color;
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
    pressButton: (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const button = this.state.button;
      if (button.stage === 0) {
        button.target = Math.max(
          BUTTON_MIN_CLICK_TARGET,
          this.state.players.size * BUTTON_CLICKS_PER_PLAYER,
        );
        button.stage = 1;
        this.broadcast("buttonPress", {}, { except: client });
        return;
      }
      if (button.stage !== 1) return;
      button.clicks += 1;
      this.broadcast("buttonPress", {}, { except: client });
      if (button.clicks >= button.target) {
        button.stage = 2;
        this.spawnPrankBalls();
      }
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
    this.state.button.target = BUTTON_MIN_CLICK_TARGET;
    this.setSimulationInterval(() => {
      this.updateGameplay();
      this.world.update(TICK_MS / 1000);
    }, TICK_MS);
  }

  onJoin(client: Client, options: { color?: unknown }) {
    const player = new Player();
    player.name = "TestPlayer_" + client.sessionId;
    player.x = SPAWN_POINT.x;
    player.y = SPAWN_POINT.y;
    if (
      typeof options.color === "string" &&
      COLOR_STATIONS.some((station) => station.color === options.color)
    ) {
      player.color = options.color;
    }
    this.state.players.set(client.sessionId, player);
    console.log(client.sessionId, "joined!");
  }

  async onLeave(client: Client, code: CloseCode) {
    if (code !== CloseCode.CONSENTED) {
      try {
        await this.allowReconnection(client, 10);
        console.log(client.sessionId, "reconnected!");
        return;
      } catch {
        // The grace period expired; remove the abandoned player below.
      }
    }
    this.state.players.delete(client.sessionId);
    this.world.forgetPlayer(client.sessionId);
    this.updateGameplay();
    console.log(client.sessionId, "left!", code);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  private spawnPrankBalls() {
    const centerX = BUTTON.x + BUTTON.width / 2;
    const centerY = BUTTON.y + BUTTON.height / 2;
    for (let i = 0; i < BALL_SPAWN_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 60;
      const x = Math.max(60, Math.min(WORLD_WIDTH - 60, centerX + Math.cos(angle) * distance));
      const y = Math.max(
        WORLD_TOP + 60,
        Math.min(WORLD_HEIGHT - 60, centerY + Math.sin(angle) * distance),
      );
      const speed = 650 + Math.random() * 450;
      this.world.spawnEntity(
        {
          kind: "ball",
          id: `prank-ball-${i}`,
          x,
          y,
          radius: 16,
          color: BALL_SPAWN_COLORS[i % BALL_SPAWN_COLORS.length],
        },
        { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed },
      );
    }
  }

  private playerOverlaps(player: Player, rect: Rect) {
    return circleOverlapsRect(player.x, player.y, PLAYER_RADIUS, rect);
  }

  private plateOccupants(definition: Rect): PlateOccupant[] {
    const occupants: PlateOccupant[] = [];
    for (const player of this.state.players.values()) {
      if (this.playerOverlaps(player, definition)) {
        occupants.push({ entityKind: "player", color: player.color, charged: player.charged });
      }
    }
    occupants.push(...this.world.occupantsInRect(definition));
    return occupants;
  }

  private updateElectricity() {
    const players = [...this.state.players.values()];
    const charged = new Set<Player>();
    for (const player of players) {
      if (this.playerOverlaps(player, ELECTRIC_SOURCE)) charged.add(player);
    }
    for (let grew = true; grew; ) {
      grew = false;
      for (const a of players) {
        if (!charged.has(a)) continue;
        for (const b of players) {
          if (charged.has(b) || a === b) continue;
          if (Math.hypot(a.x - b.x, a.y - b.y) <= ELECTRIC_LINK_RANGE) {
            charged.add(b);
            grew = true;
          }
        }
      }
    }
    for (const player of players) player.charged = charged.has(player);
  }

  private updateGameplay() {
    this.updateElectricity();
    const now = Date.now();
    const totalPlayers = this.state.players.size;

    const occupantsByPlate = new Map<string, PlateOccupant[]>();
    const matchingCounts = new Map<string, number>();
    for (const definition of PLATES) {
      const occupants = this.plateOccupants(definition);
      occupantsByPlate.set(definition.id, occupants);
      matchingCounts.set(
        definition.id,
        occupants.filter((occupant) => occupantMatchesFilter(occupant, definition.filter)).length,
      );
    }
    const otherCount = (plateId: string) => matchingCounts.get(plateId) ?? 0;

    const activePlates = new Map<string, boolean>();
    for (const definition of PLATES) {
      const active = evaluatePlate(
        occupantsByPlate.get(definition.id) ?? [],
        definition,
        totalPlayers,
        otherCount,
      );
      activePlates.set(definition.id, active);
      const plate = this.state.plates.get(definition.id);
      if (plate) plate.active = active;
    }

    this.world.collectEntities(TRASH_PLATE, "ball");

    for (const doorId of DOOR_IDS) {
      const doorDef = DOORS.find((door) => door.id === doorId);
      const gatingPlates = PLATES.filter((definition: PlateDef) =>
        definition.doorIds.includes(doorId),
      );
      const satisfied =
        doorId === TRASH_DOOR_ID
          ? this.state.button.stage === 2 && this.prankBallsRemaining() === 0
          : doorDef?.plateGroups
            ? doorDef.plateGroups.some((group) => group.every((id) => activePlates.get(id)))
            : gatingPlates.length > 0 && gatingPlates.every((plate) => activePlates.get(plate.id));
      if (satisfied) {
        this.doorOpenUntil.set(doorId, now + DOOR_HOLD_MS);
        if (PERMANENT_DOORS.has(doorId)) this.unlockedDoors.add(doorId);
      }
      const door = this.state.doors.get(doorId);
      if (door) {
        door.open = this.unlockedDoors.has(doorId) || now < (this.doorOpenUntil.get(doorId) ?? 0);
      }
    }
  }

  private prankBallsRemaining() {
    let count = 0;
    for (const entity of this.state.entities.values()) {
      if (entity.id.startsWith("prank-ball-")) count++;
    }
    return count;
  }
}
