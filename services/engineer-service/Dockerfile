ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine AS base
# Setting Pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Pnpm automatically uses the mounted path
ENV PNPM_CONFIG_STORE_DIR="/pnpm/store"
RUN corepack enable

FROM base AS dev_dep
WORKDIR /app
# Enhance build speed by cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy inner packages for service build
COPY packages/logger/package.json ./packages/logger/
COPY packages/logger-middleware/package.json ./packages/logger-middleware/
COPY packages/response/package.json ./packages/response/
# Copy services
COPY services/engineer-service/package.json ./services/engineer-service/

# Use cache mount enhance install speed
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM dev_dep AS build
WORKDIR /app
COPY . .
# Build everything that is needed for the engineer-service, including its dependencies
RUN pnpm --filter=engineer-service... build

# Isolate the engineer-service and its production dependencies into a standalone folder
# This eliminates workspace symlinks and flattens everything into /prod/engineer-service
RUN pnpm --filter=engineer-service deploy --legacy /prod/engineer-service

# Final stage
FROM node:${NODE_VERSION}-alpine
WORKDIR /app

USER node
# Copy production only packages
# Change ownership before copy
COPY --from=build --chown=node:node /prod/engineer-service /app/

EXPOSE 3000
CMD ["node", "dist/main.js"]