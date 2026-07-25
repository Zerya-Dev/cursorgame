import { Room, Client, CloseCode } from "colyseus";
import {Door, MainRoomState, Player} from "./schema/MainRoomState.js";
import {ArraySchema} from "@colyseus/schema";

function doorCheck(player: Player, doors: ArraySchema<Door>) {
  for (const door of doors.values()) {
    if (player.x == door.xButton && player.y == door.yButton) {
      console.log("Player " + player.name + " pressed the button for door " + door.name);
      door.open = true;
    }
  }
}

export class MainRoom extends Room {
  maxClients = 500;
  state = new MainRoomState();

  messages = {
    move: (client: Client, message: any) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = message.x;
        player.y = message.y;
        this.state.players.set(client.sessionId, player);
        doorCheck(player, this.state.doors);
      }
    }
  }

  onCreate (options: any) {
    /**
     * Called when a new room is created.
     */
  }

  onJoin (client: Client, options: any) {
    /**
     * Called when a client joins the room.
     */
    const door = new Door();
    door.open = false;
    door.xButton = 5;
    door.yButton = 1;
    this.state.doors.push(door);

    const player = new Player();
    player.name = "TestPlayer_" + client.sessionId;
    player.x = 0;
    player.y = 0;
    this.state.players.set(client.sessionId, player);
    console.log(client.sessionId, "joined!");
  }

  onLeave (client: Client, code: CloseCode) {
    /**
     * Called when a client leaves the room.
     */
    this.state.players.delete(client.sessionId);
    console.log(client.sessionId, "left!", code);
  }

  onDispose() {
    /**
     * Called when the room is disposed.
     */
    console.log("room", this.roomId, "disposing...");
  }

}
