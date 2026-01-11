# localtunnel

[![npm version](https://img.shields.io/npm/v/localtunnel-client)](https://npmjs.com/package/localtunnel-client)
[![npm version](https://img.shields.io/npm/v/localtunnel-server)](https://npmjs.com/package/localtunnel-server)
[![License](https://img.shields.io/npm/l/localtunnel)](LICENSE)

A modern, Bun-native localtunnel implementation that exposes your localhost to the world. Built with TypeScript and Effect.ts for reliability.

## What is localtunnel?

Localtunnel creates a public URL that forwards traffic to your local development server. Useful for:
- Testing webhooks locally
- Sharing work-in-progress with teammates
- Demoing applications without deployment
- Testing mobile apps against local backends

## Quick Start

```bash
# Install and build
bun install
bun run compile
bun run link

# Start a tunnel to your local server on port 3000
lt --port 3000

# Or specify a custom subdomain
lt --port 3000 --subdomain myapp
```

Your local server is now accessible at `https://myapp.localtunnel.me`.

## Installation

### Prerequisites

- Bun 1.0.0+
- Node.js 18+ (for npm packages)

### From Source

```bash
# Clone the repository
git clone https://github.com/imsus/localtunnel.git
cd localtunnel

# Install dependencies
bun install

# Build and link CLI tools
bun run link

# Verify installation
lt --help
localtunnel-server --help
```

### Using npm Packages

```bash
# Install client package
npm install localtunnel-client

# Install server package
npm install localtunnel-server
```

## Packages

### @localtunnel/client

Expose your localhost to the world.

**CLI:**

```bash
lt --port 3000                    # Random subdomain
lt --port 3000 --subdomain myapp  # Custom subdomain
lt --port 3000 --host localhost:8080  # Custom tunnel server
```

**API:**

```typescript
import { openTunnel, openTunnelCluster } from "@localtunnel/client";

const tunnel = await openTunnelCluster(3000, {
  subdomain: "myapp",
  host: "localtunnel.me",
});

console.log(`Tunnel URL: ${tunnel.url}`);

// Listen for requests
tunnel.onRequest(({ method, path }) => {
  console.log(`${method} ${path}`);
});

// Close when done
await tunnel.close();
```

### @localtunnel/server

Run your own tunnel server.

**CLI:**

```bash
# Start server on port 8080
localtunnel-server --port 8080

# With custom settings
localtunnel-server --port 8080 --admin-port 9090
```

**Configuration:**

| Flag           | Environment Variable | Default   | Description    |
| -------------- | -------------------- | --------- | -------------- |
| `--port`       | `LT_SERVER_PORT`     | 8080      | Server port    |
| `--admin-port` | `LT_ADMIN_PORT`      | -         | Admin API port |
| `--host`       | `LT_HOST`            | `0.0.0.0` | Bind address   |

### @localtunnel/shared

Shared utilities for configuration management.

```typescript
import { getClientConfig, getServerConfig } from "@localtunnel/shared";

// Client configuration from args/environment
const clientConfig = getClientConfig({ port: 3000 });

// Server configuration from args/environment
const serverConfig = getServerConfig({ port: 8080 });
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run e2e tests
bun run test:e2e

# Run tests with coverage
bun run test:coverage

# Lint codebase
bun run lint

# Format code
bun run fmt

# Check formatting without writing
bun run fmt --check

# TypeScript type checking
bun run typecheck

# Full validation (lint + format + tests)
bun run check

# Build all packages
bun run compile

# Link CLI tools globally
bun run link

# Unlink CLI tools
bun run unlink
```

## Environment Variables

### Client

| Variable  | Description                                    |
| --------- | ---------------------------------------------- |
| `LT_HOST` | Tunnel server host (default: `localtunnel.me`) |
| `LT_PORT` | Tunnel server port                             |

### Server

| Variable         | Description                       |
| ---------------- | --------------------------------- |
| `LT_SERVER_PORT` | Server port (default: 8080)       |
| `LT_ADMIN_PORT`  | Admin API port                    |
| `LT_HOST`        | Bind address (default: `0.0.0.0`) |

## Troubleshooting

### Tunnel won't connect

1. Check your firewall allows outbound connections
2. Verify the tunnel server is running and accessible
3. Try a different subdomain

```bash
lt --port 3000 --subdomain different-name
```

### Connection timeout

The default connection timeout is 30 seconds. Increase it:

```bash
lt --port 3000 --timeout 60000
```

### Port already in use

Specify a different port:

```bash
lt --port 3001
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Architecture

See [ROADMAP.md](ROADMAP.md) for architecture decisions and future plans.

## License

MIT
