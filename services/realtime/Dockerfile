FROM node:22-alpine

WORKDIR /app

COPY services/realtime/package.json ./services/realtime/package.json

RUN npm install --omit=dev --prefix ./services/realtime

COPY services/realtime ./services/realtime

ENV NODE_ENV=production

WORKDIR /app/services/realtime

CMD ["npm", "run", "start"]
