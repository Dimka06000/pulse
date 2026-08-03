# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# Pulse — sovereign cluster image (Hetzner/Talos, built in-cluster by Argo).
# Next.js 15 standalone output.
#
# npm, NOT pnpm: this repo ships a package-lock.json (the Levioosa image, which
# this one follows, uses pnpm — do not copy its install lines verbatim).
#
# The build stays on webpack rather than Turbopack: next.config.ts aliases
# @oikos/coaching to the vendored ./coaching-src and @oikos/core to a local
# stub, and those are `config.resolve.alias` entries that only webpack reads.
# Building with --turbopack would silently fail to resolve them.
#
# Build (BuildKit required for the secret mount):
#   docker build --secret id=build_env,src=.env.build \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... [other NEXT_PUBLIC_* args] \
#     -t pulse:local .
# ---------------------------------------------------------------------------
ARG NODE_VERSION=24-slim

FROM node:${NODE_VERSION} AS base
ENV HUSKY=0
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---- deps: install from the lockfile ---------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
# `npm ci` is the lockfile-exact install. The cache mount keeps the npm store
# warm across builds on the persistent buildkitd.
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm ci --no-audit --no-fund

# ---- builder: next build (standalone) --------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time PUBLIC env — Next inlines these into the client bundle, so they
# must be present HERE and not merely at runtime. They are not secrets (they
# ship to the browser regardless).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_PLATFORM_FEE_PERCENT
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_PUBLIC_PLATFORM_FEE_PERCENT=$NEXT_PUBLIC_PLATFORM_FEE_PERCENT \
    NEXT_TELEMETRY_DISABLED=1

ENV NODE_OPTIONS="--max-old-space-size=4096"

# Server secrets needed by any page evaluated during `next build` are mounted
# only for this RUN, so they never persist in a layer.
RUN --mount=type=secret,id=build_env \
    --mount=type=cache,id=nextcache,target=/app/.next/cache \
    sh -c 'set -a; if [ -f /run/secrets/build_env ]; then . /run/secrets/build_env; fi; set +a; npm run build'

# ---- runner: minimal standalone server -------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# sharp: the native image optimizer next/image needs when self-hosting (Vercel
# supplied it transparently). Installed in the runner so the binary matches the
# runtime platform.
RUN npm install --no-save sharp \
    && rm -rf /root/.npm

RUN groupadd --system --gid 1001 nodejs \
    && useradd  --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

USER nextjs
EXPOSE 3000

# Runtime secrets (Supabase service role, Stripe, VAPID, cron) are injected by
# the cluster from Infisical at container start — never baked into the image.
CMD ["node", "server.js"]
