# localtunnel

A modern, monorepo-based implementation of localtunnel using Bun, TypeScript, and Effect.ts.

## Structure

```
localtunnel/
├── packages/
│   ├── client/     # Tunnel client - connects to server and forwards traffic
│   └── server/     # Tunnel server - manages tunnels and proxies requests
│   └── shared/     # Shared utilities
└── README.md
```

## Installation

### Quick Install (Recommended)

```bash
# Clone and install
git clone <repo>
cd localtunnel
bun install

# Build and link CLI tools
bun run link

# Add bun bin to PATH (add to ~/.zshrc or ~/.bashrc)
export PATH="$HOME/.bun/bin:$PATH"

# Verify installation
lt --help
localtunnel-server --help
```

### Or use the install script

```bash
bun run install:cli
```

### Manual Setup

```bash
bun install
bun run compile --filter localtunnel-client
bun run compile --filter localtunnel-server

# Run directly
./packages/client/lt --port 3000
./packages/server/localtunnel-server --port 8080
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

### @localtunnel/shared

Shared utilities for localtunnel packages. Provides environment configuration and env file loading.

**Features:**

- `.env` file loading
- Client/server configuration from args and environment variables
- Consistent configuration across packages

**Usage:**

```typescript
import { getClientConfig, getServerConfig } from "@localtunnel/shared";

const clientConfig = getClientConfig({ port: 3000 });
const serverConfig = getServerConfig({ port: 8080 });
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build packages
bun run compile

# Link CLI tools globally (adds lt and localtunnel-server to ~/.bun/bin)
bun run link

# Unlink CLI tools
bun run unlink

# Lint
bun run lint

# Format
bun run fmt
```

## License

MIT
