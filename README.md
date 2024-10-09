# Stack Auth Proxy

Stack Auth Proxy is a simple one-command proxy that authenticates your HTTP requests and redirects to a pre-built sign-in page if a user is not authenticated.

## Setup

First, create your API keys on the [Stack Auth Dashboard](https://app.stack-auth.com). Note that Stack Auth is open-source and can be self-hosted; more details are available [here](https://github.com/stack-auth/stack).

Then, start your server on port `<server-port>` and run the proxy server with the following command:

```sh
docker run \
  -e NEXT_PUBLIC_STACK_PROJECT_ID=<project-id> \
  -e NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=<client-key> \
  -e STACK_SECRET_SERVER_KEY=<server-key> \
  -e PROTECTED_PATTERN=<protected-pattern> \
  -e SERVER_PORT=<server-port> \
  -e PROXY_PORT=<proxy-port> \
  -p <proxy-port>:<proxy-port> \
  stackauth/auth-proxy:latest
```

The `PROTECTED_PATTERN` is a glob-style pattern. For example, if you want to protect everything under `/protected`, you can set it to `"/protected**"`; If you want to protect everything, use `"**"`.

Now, you can access your server at `http://localhost:<proxy-port>`, and all the routes under `/protected` will be protected by Stack Auth.

<details>
  <summary>If you don't have a website, you can run our example server to play around with the proxy</summary>

Start the example server on port 3000:
```sh
git clone git@github.com:stack-auth/auth-proxy.git
cd express-example-server
npm install
npm run dev
```

You can check out the original server without the proxy at [localhost:3000](http://localhost:3000).

Now, open a new terminal and run the proxy server on port 3000:

```sh
docker run \
  -e NEXT_PUBLIC_STACK_PROJECT_ID=<project-id> \
  -e NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=<client-key> \
  -e STACK_SECRET_SERVER_KEY=<server-key> \
  -e PROTECTED_PATTERN="/protected**" \
  -e SERVER_PORT=3000 \
  -e PROXY_PORT=3001 \
  -p 3001:3001 \
  stackauth/auth-proxy:latest
```

You can explore the proxy at [localhost:3001](http://localhost:3001).
</details>

## What You Get

If you access a protected page through the proxy without being authenticated, you will be redirected to a sign-in page like this (customizable on the dashboard):

<div align="center">
<img alt="Stack Setup" src="assets/sign-in.png" width="400" />
</div>

After signing in, you will be able to access the protected pages. 

To retrieve user information from your webpage, you can read the headers as shown in this JavaScript Express + handlebars example (works similarly on other languages/frameworks):

```js
const express = require("express");
const handlebars = require("handlebars");

const app = express();

const template = handlebars.compile(`
<div>
  {{#if authenticated}}
    <p>Name: {{displayName}}</p>
    <p><a href="/handler/account-settings">Account Settings</a></p>
  {{else}}
    <p><a href="/handler/sign-in">Sign In</a></p>
  {{/if}}
</div>
`);

app.get('/', (req, res) => {
  const authenticated = !!req.headers['x-stack-authenticated'];
  const displayName = req.headers['x-stack-user-display-name'] || '';
  const html = template({ authenticated, displayName });
  res.send(html);
});

app.listen(3000);
```

Available headers:

- `x-stack-authenticated`: "true" if authenticated; not present otherwise.
- `x-stack-user-id`
- `x-stack-user-primary-email`
- `x-stack-user-display-name`

Available URLs (redirect your app server to these URLs as needed):

- `/handler/sign-in`
- `/handler/sign-up`
- `/handler/sign-out`: Clears cookies and redirects back to your homepage.
- `/handler/account-settings`: Users can update their email, display name, password, etc.
- `/handler/me`: If you make a request to this URL with the user's session cookie, you get a more detailed user object. This is useful for client-side apps.

## How It Works

When a request is received, the logic is as follows:

```
if url is /handler/*:
  render the auth pages
else:
  if user is not authenticated && url is protected:
    redirect to /handler/sign-in
  else:
    forward the request to your server with user info headers
```

```mermaid
graph TB
    Client((Request))
    Proxy[Stack Auth Proxy]
    YourServer[Your Server]
    StackAuthServer[Stack Auth Server]
    
    Client --> Proxy
    Proxy --> |"add user info headers"| YourServer
    Proxy --> StackAuthServer
    StackAuthServer --> Proxy

    classDef container fill:#1168bd,stroke:#0b4884,color:#ffffff
    class StackAuthServer container
    class YourServer container
    class Proxy container
```

This diagram illustrates the request flow and interactions between the client, the proxy, your server, and the Stack Auth server.