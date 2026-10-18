FROM node:22-alpine AS dependencias

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci


FROM dependencias AS desenvolvimento

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]


FROM dependencias AS construcao

ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN npm run build


FROM node:22-alpine AS producao

ARG VERSAO=local
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    VERSAO=$VERSAO

WORKDIR /app

COPY --from=construcao --chown=node:node /app/.next/standalone ./
COPY --from=construcao --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

CMD ["node", "server.js"]
