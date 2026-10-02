# Production multi-stage Dockerfile for TERIMBERE Rwanda Smart Ag
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for optimal layer caching
COPY package*.json ./
RUN npm ci

# Copy full application source
COPY . .

# Build Vite client assets
RUN npm run build

# Production runtime image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend assets and bundled production server
COPY --from=builder /app/dist ./dist

# Expose server port
EXPOSE 3000

# Start compiled server
CMD ["node", "dist/server.cjs"]
