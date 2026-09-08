FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/ ./packages/
RUN npm ci
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/*/dist/ /app/packages/*/dist/
COPY --from=builder /app/node_modules/ /app/node_modules/
COPY --from=builder /app/package.json /app/package.json
COPY packages/gateway/dist/ /app/packages/gateway/dist/
EXPOSE 8080
CMD ["node", "packages/gateway/dist/index.js"]
