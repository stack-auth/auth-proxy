import "server-only";

import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  // hack to make it build without env vars
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID || "project_id_placeholder",
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY || "publishable_client_key_placeholder",
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY || "secret_server_key_placeholder",
  urls: {
    handler: "/handler",
  }
});
