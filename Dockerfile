# Standalone backend repo (root = NestJS app). For a full monorepo, use a Dockerfile that targets backend/ from the repo root instead.
# Debian-based image: Prisma's linux-musl (Alpine) engine needs libssl.so.1.1, which current Alpine images don't ship — use glibc + OpenSSL 3 instead.
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production

# Render injects PORT; the app reads process.env.PORT (defaults to 4000 locally).
EXPOSE 4000

CMD ["npm", "run", "start"]
