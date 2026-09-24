# Offizielles Playwright-Image: bringt Chromium samt Systembibliotheken mit (amd64 + arm64)
FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js index.html ./
ENV DATA_DIR=/data HOME=/data PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
