FROM node:18-alpine AS builder

WORKDIR /app

RUN npm install -g @stackframe/auth-proxy

FROM node:18-alpine

ENV STACK_PROJECT_ID=${STACK_PROJECT_ID}
ENV STACK_PUBLISHABLE_CLIENT_KEY=${STACK_PUBLISHABLE_CLIENT_KEY}
ENV STACK_SECRET_SERVER_KEY=${STACK_SECRET_SERVER_KEY}
ENV SERVER_PORT=${SERVER_PORT}
ENV PROXY_PORT=${PROXY_PORT}

COPY --from=builder /usr/local/lib/node_modules/@stackframe /usr/local/lib/node_modules/@stackframe

EXPOSE ${PROXY_PORT}

CMD ["npx", "@stackframe/stack-proxy", "-s", "${SERVER_PORT}", "-p", "${PROXY_PORT}"]
