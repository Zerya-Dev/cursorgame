export const GAME_WIDTH = 1000;
export const GAME_HEIGHT = 1000;

// The playable world is much larger than the viewport; the camera follows the
// in-game cursor around it.
export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 2400;

// Colyseus backend endpoint. Override with VITE_COLYSEUS_URL in a .env file.
export const ROOM_NAME = "main_room";
export const COLYSEUS_URL =
  import.meta.env.VITE_COLYSEUS_URL ??
  (import.meta.env.DEV
    ? "ws://localhost:2567"
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`);
