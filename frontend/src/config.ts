export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Colyseus backend endpoint. Override with VITE_COLYSEUS_URL in a .env file.
export const COLYSEUS_URL =
  import.meta.env.VITE_COLYSEUS_URL ?? "ws://localhost:2567";

// Name of the room registered on the Colyseus server (gameServer.define(...)).
export const ROOM_NAME = "cursor_room";
