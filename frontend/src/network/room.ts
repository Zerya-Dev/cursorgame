import { Client, Room } from "colyseus.js";
import { COLYSEUS_URL, ROOM_NAME } from "../config";
import type { RoomState } from "./state";

let client: Client | null = null;

export function getClient(): Client {
  if (!client) {
    client = new Client(COLYSEUS_URL);
  }
  return client;
}

/**
 * Join the shared cursor room (or create it if it does not exist yet).
 */
export async function joinRoom(): Promise<Room<RoomState>> {
  return getClient().joinOrCreate<RoomState>(ROOM_NAME);
}
