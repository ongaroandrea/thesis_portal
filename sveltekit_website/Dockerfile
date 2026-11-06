# syntax=docker/dockerfile:1

FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
COPY . .
ARG PUBLIC_URL=http://localhost:5173
ENV PUBLIC_URL=${PUBLIC_URL}
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/scripts ./scripts

# The local_storage volume is mounted here. Creating the directory owned by
# `node` lets Docker initialise a new named volume with the same ownership;
# otherwise it is created as root and uploads fail with EACCES.
RUN mkdir -p /app/storage && chown node:node /app/storage

USER node
EXPOSE 3000

# adapter-node rejects bodies over BODY_SIZE_LIMIT (default 512K) with 413.
# An exam upload sends up to 6 photos (one per reference view) as base64
# (4/3 of the size) in one request, so allow 9x the per-photo limit.
# Set BODY_SIZE_LIMIT explicitly to override.
CMD ["sh", "-c", "export BODY_SIZE_LIMIT=\"${BODY_SIZE_LIMIT:-$(( ${PUBLIC_MAX_IMAGE_MB:-5} * 9 ))M}\"; exec node build"]
