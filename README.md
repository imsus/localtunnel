# localtunnel

A modern, monorepo-based implementation of localtunnel using Bun, TypeScript, and Effect.ts.

## Structure

```
localtunnel/
├── packages/
│   ├── client/     # Tunnel client - connects to server and forwards traffic
│   └── server/     # Tunnel server - manages tunnels and proxies requests
└── README.md
```

## Packages

### @localtunnel/client

Exposes your localhost to the world. Connect to a tunnel server and forward traffic.

**Binaries:**
- `lt` - CLI tool to start a tunnel

**API:**
```typescript
import { openTunnel, openTunnelCluster } from "@localtunnel/client";

const tunnel = await openTunnelCluster(3000, {
  subdomain: "myapp",
  host: "localtunnel.me",
});

console.log(tunnel.url);
tunnel.onRequest(({ method, path }) => {
  console.log(`${method} ${path}`);
});
await tunnel.close();
```

### @localtunnel/server

Run your own tunnel server. Accepts tunnel connections and proxies HTTP requests.

**Binaries:**
- `localtunnel-server` - CLI tool to start the server

**Usage:**
```bash
localtunnel-server --port 8080
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build packages
bun run compile

# Lint
bun run lint

# Format
bun run fmt
```

## License

MIT
