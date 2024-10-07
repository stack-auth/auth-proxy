FROM node:18-alpine AS builder

WORKDIR /app

RUN npm install -g @stackframe/auth-proxy@latest

FROM node:18-alpine

COPY --from=builder /usr/local/lib/node_modules/@stackframe /usr/local/lib/node_modules/@stackframe
COPY --from=builder /usr/local/bin /usr/local/bin

EXPOSE ${PROXY_PORT}

CMD ["auth-proxy"]
