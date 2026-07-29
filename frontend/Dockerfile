FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
# --legacy-peer-deps: several UI libs still declare React 18 in peerDependencies;
# without this flag npm 7+ throws ERESOLVE against React 19 and the build never starts.
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
