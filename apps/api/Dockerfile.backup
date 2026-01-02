FROM node:18-alpine

WORKDIR /app

# Copy the entire monorepo to access local packages
COPY .. /workspace
WORKDIR /workspace/apps/api

COPY apps/api/.npmrc ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3020

ENV NODE_ENV=production
ENV PORT=3020

CMD ["npm", "start"]
