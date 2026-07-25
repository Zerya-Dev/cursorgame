export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

export { WORLD_WIDTH, WORLD_HEIGHT } from "@shared";

// Colyseus backend endpoint. Override with VITE_COLYSEUS_URL in a .env file.
export const ROOM_NAME = "main_room";
export const COLYSEUS_URL =
  import.meta.env.VITE_COLYSEUS_URL ??
  (import.meta.env.DEV
    ? "ws://localhost:2567"
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`);
