FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3020

ENV NODE_ENV=production
ENV PORT=3020

CMD ["npm", "start"]
