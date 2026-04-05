FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm install

COPY . .
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start"]
