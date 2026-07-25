import type { Room } from "@colyseus/sdk";
import { joinRoom } from "./room";
import type { RoomState } from "./state";

interface MultiplayerEvents {
  onState: (state: RoomState, sessionId: string) => void;
  onSpray: (x: number, y: number, angle: number, color: number) => void;
  onButtonPress: () => void;
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: unknown) => void;
}

export class MultiplayerClient {
  private room?: Room<RoomState>;
  private lastSentX = Number.NaN;
  private lastSentY = Number.NaN;
  private nextUpdate = 0;
  private active = true;

  constructor(private readonly events: MultiplayerEvents) {}

  async connect() {
    try {
      const room = await joinRoom();
      if (!this.active) {
        await room.leave();
        return;
      }
      this.room = room;
      this.events.onConnected();
      room.onStateChange((state) => this.events.onState(state, room.sessionId));
      room.onMessage("spray", (message: { x: number; y: number; angle: number; color: number }) =>
        this.events.onSpray(message.x, message.y, message.angle, message.color),
      );
      room.onMessage("buttonPress", () => this.events.onButtonPress());
      room.onLeave(() => {
        if (this.room !== room) return;
        this.room = undefined;
        this.events.onDisconnected();
      });
    } catch (error) {
      this.events.onError(error);
    }
  }

  publishPosition(time: number, x: number, y: number) {
    if (!this.room || time < this.nextUpdate) return;
    if (x === this.lastSentX && y === this.lastSentY) return;
    this.room.send("move", { x, y });
    this.lastSentX = x;
    this.lastSentY = y;
    this.nextUpdate = time + 50;
  }

  setColor(color: string) {
    this.room?.send("setColor", { color });
  }

  spray(x: number, y: number, angle: number, color: number) {
    this.room?.send("spray", { x, y, angle, color });
  }

  pressButton() {
    this.room?.send("pressButton", {});
  }

  async disconnect() {
    this.active = false;
    const room = this.room;
    this.room = undefined;
    await room?.leave();
  }
}
