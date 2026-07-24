# cursorgame — frontend

A simple [Phaser 3](https://phaser.io/) client that connects to a
[Colyseus](https://colyseus.io/) backend and renders every connected player's
cursor as a dot in a shared room.

## Stack

- **Phaser 3** — rendering / game loop
- **colyseus.js** — realtime multiplayer client
- **Vite** — dev server & bundler
- **TypeScript**

## Getting started

```bash
pnpm install
cp .env.example .env   # adjust VITE_COLYSEUS_URL if needed
pnpm dev
```

Open http://localhost:5173. The client tries to join a `cursor_room` on the
Colyseus server at `ws://localhost:2567`.

## Scripts

| Command        | Description                          |
| -------------- | ------------------------------------ |
| `pnpm dev`     | Start the Vite dev server            |
| `pnpm build`   | Type-check and produce a production build |
| `pnpm preview` | Preview the production build         |

## Expected backend

This client expects a Colyseus room named `cursor_room` with the following
state schema (`src/network/state.ts` mirrors it):

```ts
class Player extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") color: number;
}

class RoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}
```

The room should handle a `"move"` message: `{ x: number, y: number }` and update
the sending player's position.
