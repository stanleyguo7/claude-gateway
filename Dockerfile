# Stage 1: Build client
FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Install server dependencies
FROM node:20-alpine AS server-deps

WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

# Stage 3: Production image
FROM node:20-alpine

WORKDIR /app

# Install Claude CLI (requires npm)
RUN npm install -g @anthropic-ai/claude-code || true

# Copy server dependencies
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Copy server source
COPY server/package.json ./server/
COPY server/src/ ./server/src/

# Copy built client
COPY --from=client-build /app/client/dist ./client/dist

# Create data and uploads directories
RUN mkdir -p server/data server/uploads

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

WORKDIR /app/server
CMD ["node", "src/index.js"]
