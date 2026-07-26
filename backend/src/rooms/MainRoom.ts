import { Room, Client, CloseCode } from "colyseus";
import { MainRoomState } from "./schema/MainRoomState.js";
import { Door, InteractivePropState, Player, PressurePlate } from "./schema/GeneralSchemas.js";
import { World } from "../game/World.js";
import {
  ANGLE_SCALE,
  BALL_SPAWN_COLORS,
  BALL_SPAWN_COUNT,
  BUTTON,
  BUTTON_CLICKS_PER_PLAYER,
  BUTTON_MIN_CLICK_TARGET,
  COLOR_STATIONS,
  DOOR_IDS,
  DOORS,
  ELECTRIC_LINK_RANGE,
  ELECTRIC_SOURCES,
  END_POWER_MIN_PLAYERS,
  END_POWER_PLATE_ID,
  END_POWER_SOURCE,
  END_POWER_TARGET,
  INTERACTIVE_PROPS,
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

/** Wrap into (-pi, pi] so the fixed-point angle always fits int16. */
function normalizeAngle(angle: number) {
  const wrapped = angle % (Math.PI * 2);
  if (wrapped > Math.PI) return wrapped - Math.PI * 2;
  if (wrapped <= -Math.PI) return wrapped + Math.PI * 2;
  return wrapped;
}

const DOOR_HOLD_MS = 600;
const TICK_MS = 20;
const PROP_OUTCOMES = ["bomb", "bomb", "bomb", "speed", "speed", "speed", "nice", "nice"] as const;
type PropOutcome = (typeof PROP_OUTCOMES)[number];

export class MainRoom extends Room {
  maxClients = 40;
  patchRate = 20;
  state = new MainRoomState();
  private doorOpenUntil = new Map<string, number>();
  private unlockedDoors = new Set<string>();
  private world = new World(this.state);
  private propOutcomes = new Map<string, PropOutcome>();

  messages = {
    move: (client: Client, message: { x?: unknown; y?: unknown; angle?: unknown }) => {
      const player = this.state.players.get(client.sessionId);
      if (
        !player ||
        typeof message.x !== "number" ||
        typeof message.y !== "number" ||
        typeof message.angle !== "number"
      ) {
        return;
      }
      if (
        !Number.isFinite(message.x) ||
        !Number.isFinite(message.y) ||
        !Number.isFinite(message.angle)
      ) {
        return;
      }
      player.x = Math.round(
        Math.max(PLAYER_RADIUS, Math.min(WORLD_WIDTH - PLAYER_RADIUS, message.x)),
      );
      player.y = Math.round(
        Math.max(WORLD_TOP + PLAYER_RADIUS, Math.min(WORLD_HEIGHT - PLAYER_RADIUS, message.y)),
      );
      player.angle = Math.round(normalizeAngle(message.angle) * ANGLE_SCALE);
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
          this.activePlayers().length * BUTTON_CLICKS_PER_PLAYER,
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
    interactProp: (client: Client, message: { id?: unknown }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || typeof message.id !== "string") return;
      const definition = INTERACTIVE_PROPS.find(({ id }) => id === message.id);
      const prop = this.state.interactiveProps.get(message.id);
      if (!definition || !prop || !this.playerOverlaps(player, definition)) return;

      if (prop.status !== 0) return;
      prop.status = 1;
      const outcome = this.propOutcomes.get(definition.id) ?? "nice";
      this.broadcast("propEffect", { id: definition.id, action: "reveal" });
      this.clock.setTimeout(() => {
        if (outcome === "bomb") {
          const centerX = definition.x + definition.width / 2;
          const centerY = definition.y + definition.height / 2;
          const victims: string[] = [];
          this.state.players.forEach((candidate, sessionId) => {
            if (Math.hypot(candidate.x - centerX, candidate.y - centerY) >= 240) return;
            victims.push(sessionId);
          });
          this.broadcast("propEffect", { id: definition.id, action: "explode", victims });
          this.clock.setTimeout(() => {
            for (const sessionId of victims) {
              const victim = this.state.players.get(sessionId);
              if (!victim) continue;
              victim.x = SPAWN_POINT.x;
              victim.y = SPAWN_POINT.y;
            }
          }, 420);
        } else {
          this.broadcast("propEffect", {
            id: definition.id,
            action: outcome,
            recipient: client.sessionId,
          });
        }
      }, 600);
      this.clock.setTimeout(() => {
        prop.status = 0;
        this.propOutcomes.set(definition.id, this.randomPropOutcome());
        this.broadcast("propEffect", { id: definition.id, action: "reset" });
      }, 4200);
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
    const outcomes = [...PROP_OUTCOMES].sort(() => Math.random() - 0.5);
    for (const [index, definition] of INTERACTIVE_PROPS.entries()) {
      const prop = new InteractivePropState();
      prop.id = definition.id;
      this.state.interactiveProps.set(definition.id, prop);
      this.propOutcomes.set(definition.id, outcomes[index % outcomes.length]);
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
    const player = this.state.players.get(client.sessionId);
    if (code !== CloseCode.CONSENTED) {
      try {
        // Park the player as disconnected so their frozen body stops counting
        // toward plate rules and the electric chain while they are away.
        if (player) player.connected = false;
        await this.allowReconnection(client, 10);
        const rejoined = this.state.players.get(client.sessionId);
        if (rejoined) rejoined.connected = true;
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

  private randomPropOutcome(): PropOutcome {
    return PROP_OUTCOMES[Math.floor(Math.random() * PROP_OUTCOMES.length)];
  }

  private playerOverlaps(player: Player, rect: Rect) {
    return circleOverlapsRect(player.x, player.y, PLAYER_RADIUS, rect);
  }

  /**
   * Players still awaiting reconnection keep their schema entry so they can resume,
   * but they must not influence gameplay: a frozen body left on (or off) a plate
   * would otherwise stall `allPlayers` / `balance` rules for the whole grace period.
   */
  private activePlayers(): Player[] {
    const players: Player[] = [];
    for (const player of this.state.players.values()) {
      if (player.connected) players.push(player);
    }
    return players;
  }

  private plateOccupants(definition: Rect): PlateOccupant[] {
    const occupants: PlateOccupant[] = [];
    for (const player of this.activePlayers()) {
      if (this.playerOverlaps(player, definition)) {
        occupants.push({ entityKind: "player", color: player.color, charged: player.charged });
      }
    }
    occupants.push(...this.world.occupantsInRect(definition));
    return occupants;
  }

  private updateElectricity() {
    const players = this.activePlayers();
    const charged = new Set<Player>();
    for (const player of players) {
      if (ELECTRIC_SOURCES.some((source) => this.playerOverlaps(player, source))) {
        charged.add(player);
      }
    }
    for (let grew = true; grew;) {
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

  private hasEndPowerChain() {
    const players = this.activePlayers();
    const connected = new Set<Player>(
      players.filter((player) => this.playerOverlaps(player, END_POWER_SOURCE)),
    );
    for (let grew = true; grew;) {
      grew = false;
      for (const source of connected) {
        for (const player of players) {
          if (connected.has(player)) continue;
          if (Math.hypot(source.x - player.x, source.y - player.y) > ELECTRIC_LINK_RANGE) continue;
          connected.add(player);
          grew = true;
        }
      }
    }
    return (
      connected.size >= END_POWER_MIN_PLAYERS &&
      [...connected].some((player) => this.playerOverlaps(player, END_POWER_TARGET))
    );
  }

  private updateGameplay() {
    this.updateElectricity();
    const now = Date.now();
    const endPowerConnected = this.hasEndPowerChain();
    const totalPlayers = this.activePlayers().length;

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
      const active =
        definition.id === END_POWER_PLATE_ID
          ? endPowerConnected
          : evaluatePlate(
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
