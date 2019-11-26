FROM node:current

# Copy source
WORKDIR /build
COPY . .

# Build app
RUN npm i -D
RUN ./node_modules/.bin/tsc

# Test
RUN npm run test

# Build docs
RUN npm run swagger

# Build UI
ENV PUBLIC_URL /ui/
RUN cd ui && npm i -D && npm run build

# Minimal prod image
FROM node:current-alpine
WORKDIR /app

COPY --from=0 /build/build .
COPY --from=0 /build/ui/build ./ui
COPY --from=0 /build/swagger.json ./swagger.json
COPY --from=0 /build/scripts ./scripts
COPY package*.json ./

RUN apk add --no-cache --virtual .gyp python make g++
RUN apk add mysql-client postgresql-client bash
RUN npm ci --only=production
RUN apk del .gyp

CMD npm run migrate && node app.js
