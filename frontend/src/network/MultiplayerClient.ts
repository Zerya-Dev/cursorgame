import type { Room } from "@colyseus/sdk";
import { getClient, joinRoom } from "./room";
import type { RoomState } from "./state";

interface MultiplayerEvents {
  onState: (state: RoomState, sessionId: string) => void;
  onSpray: (x: number, y: number, angle: number, color: number) => void;
  onButtonPress: () => void;
  onPropEffect: (id: string, action: string, affectsLocal: boolean) => void;
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: unknown) => void;
}

export class MultiplayerClient {
  private room?: Room<RoomState>;
  private lastSentX = Number.NaN;
  private lastSentY = Number.NaN;
  private lastSentAngle = Number.NaN;
  private nextUpdate = 0;
  private active = false;
  private connecting?: Promise<void>;
  private desiredColor?: string;
  private generation = 0;

  constructor(private readonly events: MultiplayerEvents) {}

  async connect() {
    if (this.room) return;
    if (this.connecting) return this.connecting;
    this.active = true;
    const generation = ++this.generation;
    this.connecting = this.openRoom(generation);
    try {
      await this.connecting;
    } catch (error) {
      if (this.active && generation === this.generation) this.events.onError(error);
    } finally {
      if (generation === this.generation) this.connecting = undefined;
    }
  }

  private async openRoom(generation: number, reconnectionToken?: string) {
    let lastError: unknown;
    if (reconnectionToken) {
      for (let attempt = 0; attempt < 3 && this.isCurrent(generation); attempt++) {
        try {
          const room = await getClient().reconnect<RoomState>(reconnectionToken);
          return this.useRoom(room, generation);
        } catch (error) {
          lastError = error;
          await this.delay(250 * 2 ** attempt, generation);
        }
      }
    }

    if (!this.isCurrent(generation)) return;
    try {
      const room = await joinRoom({ color: this.desiredColor });
      this.useRoom(room, generation);
    } catch (error) {
      throw error ?? lastError;
    }
  }

  private useRoom(room: Room<RoomState>, generation: number) {
    if (!this.isCurrent(generation)) {
      void room.leave();
      return;
    }
    this.room = room;
    this.lastSentX = Number.NaN;
    this.lastSentY = Number.NaN;
    this.lastSentAngle = Number.NaN;
    this.nextUpdate = 0;
    room.onStateChange((state) => this.events.onState(state, room.sessionId));
    room.onMessage("spray", (message: { x: number; y: number; angle: number; color: number }) =>
      this.events.onSpray(message.x, message.y, message.angle, message.color),
    );
    room.onMessage("buttonPress", () => this.events.onButtonPress());
    room.onMessage(
      "propEffect",
      (message: { id: string; action: string; recipient?: string; victims?: string[] }) => {
        const affectsLocal =
          message.recipient === room.sessionId ||
          message.victims?.includes(room.sessionId) === true;
        this.events.onPropEffect(message.id, message.action, affectsLocal);
      },
    );
    room.onLeave(() => {
      if (this.room !== room || !this.active) return;
      this.room = undefined;
      this.events.onDisconnected();
      const reconnectGeneration = ++this.generation;
      this.connecting = this.openRoom(reconnectGeneration, room.reconnectionToken)
        .catch((error) => {
          if (this.isCurrent(reconnectGeneration)) this.events.onError(error);
        })
        .finally(() => {
          if (reconnectGeneration === this.generation) this.connecting = undefined;
        });
    });
    this.events.onConnected();
  }

  private isCurrent(generation: number) {
    return this.active && generation === this.generation;
  }

  private delay(ms: number, generation: number) {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, this.isCurrent(generation) ? ms : 0);
    });
  }

  publishPosition(time: number, x: number, y: number, angle: number) {
    if (!this.room || time < this.nextUpdate) return;
    if (x === this.lastSentX && y === this.lastSentY && angle === this.lastSentAngle) return;
    this.room.send("move", { x, y, angle });
    this.lastSentX = x;
    this.lastSentY = y;
    this.lastSentAngle = angle;
    this.nextUpdate = time + 50;
  }

  setColor(color: string) {
    this.desiredColor = color;
    this.room?.send("setColor", { color });
  }

  spray(x: number, y: number, angle: number, color: number) {
    this.room?.send("spray", { x, y, angle, color });
  }

  pressButton() {
    this.room?.send("pressButton", {});
  }

  interactProp(id: string) {
    this.room?.send("interactProp", { id });
  }

  async disconnect() {
    this.active = false;
    this.generation += 1;
    this.connecting = undefined;
    const room = this.room;
    this.room = undefined;
    await room?.leave();
  }
}
