# Standalone backend repo (root = NestJS app). For a full monorepo, use a Dockerfile that targets backend/ from the repo root instead.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production

# Render injects PORT; the app reads process.env.PORT (defaults to 4000 locally).
EXPOSE 4000

CMD ["npm", "run", "start"]
