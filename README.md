# 🖱️ Mouse Game

**Mouse Game** is an MMO game created for [Hack Club Horizons Europa](https://horizons.hackclub.com/). Players must cooperate using their _computer mice_ to complete some silly challenges together.

## Background

Hack Club Horizons Europe is a **boxathon** where participants build a project around a random item received in a box.

Our item was a 🐭. Fortunately, it was not a real mouse - just a cheap, classic computer mouse, so that is our theme.

## Development

### 1. Install dependencies

```shell
pnpm install
```

### 2. Start the development server

```shell
pnpm dev
```

## Docker

Build and run the production frontend and multiplayer server together:

```shell
docker compose up --build
```

Open `http://localhost:2567`. Set `PORT` when deploying to a platform that
requires a specific listening port. HTTPS deployments automatically use secure
WebSockets (`wss://`) on the same hostname.

## AI

LLMs were used during the development of the initial prototype due to limited time and the complexity of the game.
AI image generation **was not** used for any project assets.
