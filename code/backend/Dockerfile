# ─────────────────────────────────────────────────────────────────────────────
# G.U.A.R.D Backend — Dockerfile
# Node.js 22 LTS (Alpine) single-stage image.
# Prisma migrations are run at container startup via docker-compose command.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine

# Install OpenSSL — required by Prisma client on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies (includes prisma CLI for migrate deploy)
RUN npm ci

# Copy Prisma schema and generate the client
COPY prisma ./prisma
RUN npx prisma generate

# Copy application source
COPY src ./src

# Expose the Express server port
EXPOSE 3000

# Default start command (overridable in docker-compose for migrations)
CMD ["node", "src/server.js"]
