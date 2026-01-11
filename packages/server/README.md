# @localtunnel/server

[![npm version](https://img.shields.io/npm/v/localtunnel-server)](https://npmjs.com/package/localtunnel-server)
[![License](https://img.shields.io/npm/l/localtunnel-server)](../../LICENSE)

Run your own localtunnel server. Accepts tunnel connections and proxies HTTP requests to connected clients.

## Features

- HTTP proxy with Bun.serve
- Subdomain-based tunnel routing
- Request queuing for busy tunnels
- Connection timeout handling
- Built with Effect.ts for reliable concurrency

## Installation

```bash
# With Bun
bun add @localtunnel/server

# With npm
npm install @localtunnel/server
```

## Usage

### Programmatic

```typescript
import { createServer, startServer } from "@localtunnel/server";

// Create and start server
await startServer(8080, "0.0.0.0");

// Or with Effect
import { Effect } from "effect";

const program = createServer(8080, "0.0.0.0");
Effect.runPromise(program);
```

### CLI

```bash
# Install CLI globally
bun add -g @localtunnel/server

# Start server
localtunnel-server --port 8080

# With custom host
localtunnel-server --port 443 --host 0.0.0.0
```

### CLI Options

| Flag | Environment Variable | Default | Description |
|------|---------------------|---------|-------------|
| `--port` | `LT_SERVER_PORT` | 8080 | Port to listen on |
| `--host` | `LT_SERVER_HOST` | `0.0.0.0` | Host to bind to |

## Architecture

```
                    HTTP Request
                          |
                          v
              +-----------------------+
              |   Bun.serve           |
              |   (HTTP Listener)     |
              +-----------------------+
                          |
          +---------------+---------------+
          |               |               |
          v               v               v
    New Tunnel      Existing Tunnel    Invalid Path
    Request         Request             Request
          |               |               |
          v               v               v
    +-----------+   +-------------+   +---------+
    | Generate  |   | Find Client |   |  404    |
    | Subdomain |   | & Forward   |   | Response|
    +-----------+   +-------------+   +---------+
          |               |
          v               v
    +-----------+   +------------+
    | TCP       |   | Proxy      |
    | Listener  |   | Response   |
    +-----------+   +------------+
```

## API

### createServer(port, host)

Creates an Effect server that manages tunnels and proxies requests.

```typescript
import { createServer } from "@localtunnel/server";

const server = createServer(8080, "0.0.0.0");
```

### startServer(port, host)

Starts the server directly (async convenience function).

```typescript
import { startServer } from "@localtunnel/server";

await startServer(8080, "0.0.0.0");
```

### ServerConfig

```typescript
interface ServerConfig {
  host: string; // Host to bind to (default: "0.0.0.0")
  port: number; // Port to listen on (required)
}
```

## Request Flow

1. **New Tunnel Request** (`/` or `/?new`)
   - Generate 4-character subdomain
   - Create TCP server on random port
   - Return `{ url, port, id }` JSON
   - Client connects within 5s timeout

2. **Proxy Request** (`{subdomain}.host.com`)
   - Parse subdomain from Host header
   - Forward to connected client socket
   - Queue requests if client busy

3. **Path-based Tunnel** (`/{subdomain}/...`)
   - Parse subdomain from URL path
   - Same handling as subdomain-based

## Error Types

```typescript
type ServerErrors = ServerError | ProxyError | ClientError;

class ServerError {
  readonly _tag = "ServerError";
  constructor(message: string);
  // Common: "EADDRINUSE", "EACCES", binding errors
}

class ProxyError {
  readonly _tag = "ProxyError";
  constructor(message: string);
  // Common: "ECONNRESET", "EPIPE"
}

class ClientError {
  readonly _tag = "ClientError";
  constructor(message: string);
  // Common: "Handshake timeout", "Invalid handshake"
}
```

## Performance

- Uses Bun.serve for fast HTTP handling
- Effect.ts fibers for concurrent connection handling
- Request queuing prevents overwhelming clients

## See Also

- [@localtunnel/client](../client/README.md) - Connect to tunnel servers
- [@localtunnel/shared](../shared/README.md) - Shared configuration utilities
- [Main README](../../README.md) - Project overview
- [CHANGELOG](../../CHANGELOG.md) - Release notes
