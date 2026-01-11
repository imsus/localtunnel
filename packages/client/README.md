# @localtunnel/client

[![npm version](https://img.shields.io/npm/v/localtunnel-client)](https://npmjs.com/package/localtunnel-client)
[![License](https://img.shields.io/npm/l/localtunnel-client)](../../LICENSE)

Expose your localhost to the world. Connect to a tunnel server and forward traffic.

## Features

- Multiple concurrent tunnel connections (max_conn support)
- Automatic retry with exponential backoff
- Request event emission for monitoring
- HTTPS support for local servers
- Custom subdomain support

## Installation

```bash
# With Bun
bun add @localtunnel/client

# With npm
npm install @localtunnel/client
```

## Usage

### Basic

```typescript
import { openTunnel } from "@localtunnel/client";

const tunnel = await openTunnel(3000);
console.log(tunnel.url);
// Output: http://abcd123.localtunnel.me

tunnel.onRequest(({ method, path }) => {
  console.log(`${method} ${path}`);
});

await tunnel.close();
```

### With Options

```typescript
import { openTunnelCluster } from "@localtunnel/client";

const tunnel = await openTunnelCluster(3000, {
  host: "localtunnel.me", // Tunnel server URL
  subdomain: "myapp", // Request specific subdomain
  localHost: "localhost", // Proxy to different hostname
  localHttps: true, // Connect to local HTTPS server
  localCert: "/path/to/cert", // Certificate for local HTTPS
  localKey: "/path/to/key", // Key for local HTTPS
  localCa: "/path/to/ca", // CA for local HTTPS
  allowInvalidCert: true, // Skip cert validation
});

console.log(tunnel.url);
await tunnel.close();
```

## CLI

```bash
# Install CLI globally
bun add -g @localtunnel/client

# Start tunnel
lt --port 3000

# With custom subdomain
lt --port 3000 --subdomain myapp

# With custom server
lt --port 3000 --host tunnel.example.com

# Proxy to different hostname
lt --port 3000 --local-host internal.local

# HTTPS to local server
lt --port 443 --local-https
```

### CLI Options

| Flag | Environment Variable | Description |
|------|---------------------|-------------|
| `--port` | `LT_PORT` | Local port to tunnel |
| `--subdomain` | `LT_SUBDOMAIN` | Request specific subdomain |
| `--host` | `LT_HOST` | Tunnel server hostname |
| `--local-host` | `LT_LOCAL_HOST` | Proxy to different hostname |
| `--local-https` | `LT_LOCAL_HTTPS` | Enable HTTPS to local server |

## API

### openTunnel(port, options?)

Opens a single tunnel connection.

```typescript
const tunnel = await openTunnel(3000, {
  host: "localtunnel.me",
});
```

### openTunnelCluster(port, options?)

Opens multiple tunnel connections for load balancing and redundancy.

```typescript
const tunnel = await openTunnelCluster(3000, {
  subdomain: "myapp",
});
```

### Tunnel Interface

```typescript
interface Tunnel {
  url: string; // Public URL
  close: () => Promise<void>; // Close the tunnel
  onRequest: (
    listener: (info: {
      method: string; // HTTP method
      path: string; // Request path
    }) => void,
  ) => void; // Listen for requests
}
```

## Configuration

```typescript
interface TunnelConfig {
  host: string; // Tunnel server URL
  localPort: number; // Local port to tunnel
  subdomain?: string; // Request specific subdomain
  localHost?: string; // Proxy to different hostname
  localHttps?: boolean; // Use HTTPS for local connection
  localCert?: string; // Path to certificate
  localKey?: string; // Path to key
  localCa?: string; // Path to CA
  allowInvalidCert?: boolean; // Skip cert validation
}
```

## Error Types

```typescript
type TunnelErrors = ConnectionError | TimeoutError | TunnelError;

class ConnectionError {
  readonly _tag = "ConnectionError";
  constructor(host: string, port: number, reason: string);
}

class TimeoutError {
  readonly _tag = "TimeoutError";
  constructor(duration: number);
}

class TunnelError {
  readonly _tag = "TunnelError";
  constructor(message: string);
}
```

## Troubleshooting

- Tunnel won't connect? Check your firewall allows outbound connections
- Connection timeout? Try increasing timeout with `--timeout 60000`
- Port in use? Specify a different port with `--port 3001`

## See Also

- [@localtunnel/server](../server/README.md) - Run your own tunnel server
- [@localtunnel/shared](../shared/README.md) - Shared configuration utilities
- [Main README](../../README.md) - Project overview
- [CHANGELOG](../../CHANGELOG.md) - Release notes
