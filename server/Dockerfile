# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Build tools required by bcrypt (native addon)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Remove dev dependencies, keep native addons compiled above
RUN npm prune --omit=dev --legacy-peer-deps

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy pruned node_modules (includes compiled bcrypt .node binary) and compiled output
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node package*.json ./

USER node

EXPOSE 3001

CMD ["node", "dist/main"]
