FROM node:24-alpine

WORKDIR /app

COPY package.json ./package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm install

COPY apps/web ./apps/web

CMD ["npm", "run", "dev:web", "--", "--hostname", "0.0.0.0"]
