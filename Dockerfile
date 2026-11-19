# ── Build stage ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy manifests first (layer-cache friendly)
COPY package.json package-lock.json* ./

# Use npm install instead of npm ci — handles pre-release deps like TS 6.x
RUN npm install --legacy-peer-deps

# Copy source and compile
COPY . .
RUN node_modules/.bin/nest build

# ── Runtime stage ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Production dependencies only
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
