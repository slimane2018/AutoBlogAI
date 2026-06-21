# Dockerfile for the worker service (includes libvips for sharp)
# Multi-step but keeps it simple: install dependencies, generate Prisma client, build TS, run.

FROM node:18-slim AS build

# Install system dependencies required by sharp/libvips and building native modules
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    build-essential \
    python3 \
    libcairo2-dev \
    libjpeg-dev \
    libgif-dev \
    libpng-dev \
    libvips-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# copy package files and prisma schema for generate
COPY apps/worker/package.json apps/worker/package-lock.json* ./
COPY prisma ./prisma

# Install all deps (including dev) so we can run tsc and prisma generate
RUN npm ci --unsafe-perm

# Install prisma cli temporarily (if not present) and generate client
RUN npm install prisma --no-save --unsafe-perm
RUN npx prisma generate --schema=./prisma/schema.prisma || true

# Copy worker source and build
COPY apps/worker ./
RUN npm run build

# Production image
FROM node:18-slim

# libvips and runtime deps for sharp
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    libvips-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy only built artifacts and node_modules from build stage
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma

ENV NODE_ENV=production

# Health-check env examples
ENV REDIS_URL="${REDIS_URL}"
ENV DATABASE_URL="${DATABASE_URL}"

# Use a non-root user in production (optional)
RUN useradd --uid 1000 --create-home worker || true
USER worker

CMD ["node", "dist/index.js"]
