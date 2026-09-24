# Schlankes Node-Image, dazu nur die Chrome-Headless-Shell samt Systembibliotheken
# (statt des vollen Playwright-Images mit Chromium, Firefox und WebKit)
FROM node:22-bookworm-slim
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev \
 && npx playwright install --with-deps --only-shell chromium \
 && rm -rf /var/lib/apt/lists/* /root/.npm /tmp/*
COPY server.js claim.js index.html ./
ENV DATA_DIR=/data HOME=/data PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
