# @localtunnel/client

Tunnel client that exposes your localhost to the world.

## Features

- Multiple concurrent tunnel connections (max_conn support)
- Automatic retry with exponential backoff
- Request event emission for monitoring
- HTTPS support for local servers
- Custom subdomain support

## Installation

```bash
bun add @localtunnel/client
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

### With options

```typescript
import { openTunnelCluster } from "@localtunnel/client";

const tunnel = await openTunnelCluster(3000, {
  host: "localtunnel.me",      // Tunnel server URL
  subdomain: "myapp",           // Request specific subdomain
  localHost: "localhost",       // Proxy to different hostname
  localHttps: true,            // Connect to local HTTPS server
  localCert: "/path/to/cert",  // Certificate for local HTTPS
  localKey: "/path/to/key",    // Key for local HTTPS
  localCa: "/path/to/ca",      // CA for local HTTPS
  allowInvalidCert: true,      // Skip cert validation
});

console.log(tunnel.url);
await tunnel.close();
```

### CLI

```bash
# Install CLI
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

### Tunnel interface

```typescript
interface Tunnel {
  url: string;                                   // Public URL
  close: () => Promise<void>;                    // Close the tunnel
  onRequest: (listener: (info: {
    method: string;                              // HTTP method
    path: string;                                // Request path
  }) => void) => void;                          // Listen for requests
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

## Configuration

```typescript
interface TunnelConfig {
  host: string;              // Tunnel server URL
  localPort: number;         // Local port to tunnel
  subdomain?: string;        // Request specific subdomain
  localHost?: string;        // Proxy to different hostname
  localHttps?: boolean;      // Use HTTPS for local connection
  localCert?: string;        // Path to certificate
  localKey?: string;         // Path to key
  localCa?: string;          // Path to CA
  allowInvalidCert?: boolean; // Skip cert validation
}
```

## Testing

```bash
bun test
```
