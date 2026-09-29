FROM m.daocloud.io/docker.io/node:22-alpine

ARG HOST_PROXY
ENV HTTP_PROXY=${HOST_PROXY}
ENV HTTPS_PROXY=${HOST_PROXY}
ENV ALL_PROXY=${HOST_PROXY}

WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

ENV HTTP_PROXY=
ENV HTTPS_PROXY=
ENV ALL_PROXY=
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
