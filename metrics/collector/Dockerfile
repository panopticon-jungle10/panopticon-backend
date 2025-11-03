FROM node:18-alpine

WORKDIR /app

COPY package.json .
COPY collector.js .

ENV SCRAPE_INTERVAL_MS=10000

CMD ["node", "collector.js"]
