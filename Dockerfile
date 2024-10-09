FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY app ./app
COPY stack.tsx ./
COPY next.config.mjs ./
COPY postcss.config.mjs ./
COPY tailwind.config.ts ./
COPY tsconfig.json ./
COPY main.ts ./

RUN npm install -g pnpm
RUN pnpm install
RUN pnpm run build

ENV NEXT_PUBLIC_STACK_PROJECT_ID=${NEXT_PUBLIC_STACK_PROJECT_ID}
ENV NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=${NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY}
ENV STACK_SECRET_SERVER_KEY=${STACK_SECRET_SERVER_KEY}
ENV SERVER_PORT=${SERVER_PORT}
ENV PROXY_PORT=${PROXY_PORT}
ENV PROTECTED_PATTERN=${PROTECTED_PATTERN}

EXPOSE ${PROXY_PORT}

CMD sh -c 'for var in NEXT_PUBLIC_STACK_PROJECT_ID NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY STACK_SECRET_SERVER_KEY SERVER_PORT PROXY_PORT PROTECTED_PATTERN; do if [ -z "$(eval echo \$$var)" ]; then echo "Error: $var is not set."; exit 1; fi; done && node dist/main.cjs -sp $SERVER_PORT -p $PROXY_PORT -sh host.docker.internal -u "$PROTECTED_PATTERN"'