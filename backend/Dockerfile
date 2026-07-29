FROM node:20-alpine AS base
WORKDIR /app
# Prisma's engine binaries link against OpenSSL at runtime; Alpine doesn't ship it by default.
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/package*.json ./
# ts-node (used by `npm run prisma:seed`) needs this to know module: commonjs —
# without it, TypeScript's defaults resolve to ESM and Node's loader rejects
# raw .ts files with ERR_UNKNOWN_FILE_EXTENSION.
COPY --from=base /app/tsconfig.json ./tsconfig.json
EXPOSE 4000
CMD ["node", "dist/main"]
