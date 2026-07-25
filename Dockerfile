FROM node:22-slim AS builder

WORKDIR /app
RUN npm install --global pnpm@11.17.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN pnpm install --frozen-lockfile

COPY shared shared
COPY frontend frontend
COPY backend backend
RUN pnpm --filter cursorgame-frontend build \
    && pnpm --filter cursorgame-server build

FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV PORT=2567
WORKDIR /app

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=node:node /app/backend/package.json ./backend/package.json
COPY --from=builder --chown=node:node /app/backend/build ./backend/build
COPY --from=builder --chown=node:node /app/frontend/dist ./frontend/dist

USER node
EXPOSE 2567
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + process.env.PORT + '/hi').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "backend/build/index.js"]
