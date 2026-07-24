export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// The playable world is much larger than the viewport; the camera follows the
// in-game cursor around it.
export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 2400;

// Colyseus backend endpoint. Override with VITE_COLYSEUS_URL in a .env file.
export const COLYSEUS_URL =
  import.meta.env.VITE_COLYSEUS_URL ?? "ws://localhost:2567";

// Name of the room registered on the Colyseus server (gameServer.define(...)).
export const ROOM_NAME = "cursor_room";
