# @localtunnel/server

Tunnel server that manages tunnels and proxies HTTP requests.

## Features

- HTTP proxy with Bun.serve
- Subdomain-based tunnel routing
- Request queuing for busy tunnels
- Connection timeout handling
- Built with Effect.ts for reliable concurrency

## Installation

```bash
bun add @localtunnel/server
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
# Install CLI
bun add -g @localtunnel/server

# Start server
localtunnel-server --port 8080

# With custom host
localtunnel-server --port 443 --host 0.0.0.0
```

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

## Configuration

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

## Testing

```bash
bun test
```

## Performance

- Uses Bun.serve for fast HTTP handling
- Effect.ts fibers for concurrent connection handling
- Request queuing prevents overwhelming clients
