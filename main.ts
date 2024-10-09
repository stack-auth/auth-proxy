#!/usr/bin/env node

import { Command } from 'commander';
import { createServer, request as httpRequest } from "http";
import httpProxy from "http-proxy";
import UrlPattern from 'url-pattern';
import next from "next";
import { parse } from "url";
import path from "path";

// Check for required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_STACK_PROJECT_ID',
  'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
  'STACK_SECRET_SERVER_KEY',
  'SERVER_PORT',
  'PROXY_PORT',
];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Environment variable ${envVar} is required. Go to https://app.stack-auth.com and create your API keys to continue.`);
    process.exit(1);
  }
}

const proxyPort = parseInt(process.env.PROXY_PORT!);
const proxyHost = process.env.PROXY_HOST || 'localhost';
const serverPort = parseInt(process.env.SERVER_PORT!);
const serverHost = process.env.SERVER_HOST || 'localhost';

const program = new Command();
program
  .description('Auth Proxy\nA simple proxy that authenticates http requests and provide sign-in interface to your app\nAll the routes except /handler/* are forwarded to the server with the user info headers')
  .argument('[protectedPattern...]', 'The protected URL patterns (glob syntax)');

program.parse(process.argv);

if (program.args.length === 0) {
  console.error('Error: at least one protected pattern is required');
  process.exit(1);
}

const dev = process.env.NODE_ENV === "development";

const dir = path.resolve(__dirname, "..");
process.chdir(dir);
const app = next({ dev });
const handle = app.getRequestHandler();

function throwErr(message: string): never {
  throw new Error(message);
}

app.prepare().then(() => {
  createServer((req, res) => {
    let parsedUrl = parse(req.url!, true);

    if (new UrlPattern('/handler(/*)').match(parsedUrl.pathname || throwErr("parsedUrl.pathname is undefined"))) {
      // This is a hack for the account-setting + next.js basePath incompatibility, should be fixed later in the stack package
      if (req.url?.includes("/handler/handler")) {
        parsedUrl = parse(req.url.replace("/handler/handler", "/handler"), true);
      }

      handle(req, res, parsedUrl);
    } else {
      const options = {
        hostname: proxyHost,
        port: proxyPort,
        path: "/handler/me",
        method: "GET",
        headers: req.headers,
      };

      const meReq = httpRequest(options, (meRes) => {
        let data = "";
        meRes.on("data", (chunk) => {
          data += chunk;
        });

        meRes.on("end", () => {
          let userInfo;
          try {
            userInfo = JSON.parse(data);
          } catch (e) {
            console.error(e);
            res.statusCode = 500;
            res.end("Internal server error");
            return;
          }

          const proxy = httpProxy.createProxyServer({});

          proxy.on("proxyReq", (proxyReq, req, res) => {
            const allHeaders = [
              "x-stack-authenticated",
              "x-stack-user-id",
              "x-stack-user-primary-email",
              "x-stack-user-display-name",
            ];

            for (const header of allHeaders) {
              proxyReq.removeHeader(header);
            }

            if (userInfo.authenticated) {
              proxyReq.setHeader("x-stack-authenticated", "true");
              proxyReq.setHeader("x-stack-user-id", userInfo.user.id);
              proxyReq.setHeader("x-stack-user-primary-email", userInfo.user.primary_email);
              proxyReq.setHeader("x-stack-user-display-name", userInfo.user.display_name);
            } else if (program.args.some((pattern: any) => new UrlPattern(pattern).match(req.url || throwErr("req.url is undefined")))) {
              res.statusCode = 302;
              res.setHeader("Location", "/handler/sign-in");
              res.end();
              return;
            }
          });

          proxy.web(req, res, { target: `http://${serverHost}:${serverPort}` });
        });
      });

      meReq.on("error", (err) => {
        res.statusCode = 500;
        res.end("Internal server error");
      });

      meReq.end();
    }
  }).listen(parseInt(process.env.PROXY_PORT!)).on('error', (err) => {
    console.error(err);
  });

  console.log(`Auth Proxy forwarding http://${serverHost}:${serverPort} to http://${proxyHost}:${proxyPort}\nProtecting ${program.args.join(' ')}`);
}).catch((err) => {
  console.error(err);
});