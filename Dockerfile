FROM node:20-bookworm-slim AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl gnupg docker.io \
  && curl -fsSL https://apt.releases.hashicorp.com/gpg \
    | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg \
  && . /etc/os-release \
  && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com ${VERSION_CODENAME} main" \
    > /etc/apt/sources.list.d/hashicorp.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends terraform \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Copy local project files
COPY package*.json ./
RUN npm ci

# Copy rest of the application
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl gnupg docker.io \
  && curl -fsSL https://apt.releases.hashicorp.com/gpg \
    | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg \
  && . /etc/os-release \
  && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com ${VERSION_CODENAME} main" \
    > /etc/apt/sources.list.d/hashicorp.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends terraform \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 4563

ENV PORT=4563
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
