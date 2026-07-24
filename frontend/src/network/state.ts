import type { MapSchema } from "@colyseus/schema";

/**
 * Client-side view of the server room state.
 *
 * These interfaces mirror the schema defined on the Colyseus backend. They are
 * intentionally structural (not `@colyseus/schema` subclasses) so the client
 * stays decoupled from the server's schema classes — Colyseus decodes state
 * into objects with these fields and the `.onChange` / `.onAdd` / `.onRemove`
 * callbacks regardless.
 */
export interface Player {
  x: number;
  y: number;
  color: number;
}

export interface RoomState {
  players: MapSchema<Player>;
}
