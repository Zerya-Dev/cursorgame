import {Client, CloseCode, Room} from "colyseus";
import {MainRoomState} from "./schema/MainRoomState.js";
import {LobbyRoomState} from "./schema/LobbyRoomState.js";
import {Player} from "./schema/GeneralSchemas.js";

export class LobbyRoom extends Room {
    maxClients = 500;
    state = new LobbyRoomState()

    messages = {
        move: (client: Client, message: any) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.x = message.x;
                player.y = message.y;
                this.state.players.set(client.sessionId, player);
            }
        }
    }

    onCreate (options: any) {
    }

    onJoin (client: Client, options: any) {
        const player = new Player();
        player.name = "TestPlayer_" + client.sessionId;
        player.x = 0;
        player.y = 0;
        this.state.players.set(client.sessionId, player);
        console.log(client.sessionId, "joined!");
    }

    onLeave (client: Client, code: CloseCode) {
        this.state.players.delete(client.sessionId);
        console.log(client.sessionId, "left!", code);
    }

    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }

}
