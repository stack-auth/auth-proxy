FROM node:18-alpine AS builder

WORKDIR /app

RUN npm install -g @stackframe/auth-proxy@latest

FROM node:18-alpine

COPY --from=builder /usr/local/lib/node_modules/@stackframe /usr/local/lib/node_modules/@stackframe
COPY --from=builder /usr/local/bin /usr/local/bin

ENV NEXT_PUBLIC_STACK_PROJECT_ID=${NEXT_PUBLIC_STACK_PROJECT_ID}
ENV NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=${NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY}
ENV STACK_SECRET_SERVER_KEY=${STACK_SECRET_SERVER_KEY}

CMD ["auth-proxy"]
