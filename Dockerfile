# Stage 1: Install production-only Node dependencies
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Stage 2: Verify JS syntax and stage minimal production application files
FROM node:22-alpine AS builder
WORKDIR /build

COPY package.json server.js index.js index.html login.html signup.html profile.html index.css ./
COPY assets ./assets
COPY css ./css
COPY js ./js
COPY firebase-applet-config.json* ./

RUN node --check server.js \
  && node --check index.js \
  && for f in js/*.js; do node --check "$f"; done \
  && mkdir -p /dist-app \
  && cp package.json server.js index.js index.html login.html signup.html profile.html index.css /dist-app/ \
  && cp -r assets css js /dist-app/ \
  && if [ -f firebase-applet-config.json ]; then cp firebase-applet-config.json /dist-app/; fi

# Stage 3: Minimal non-root production runtime
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /dist-app/ ./

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
