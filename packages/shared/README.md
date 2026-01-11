# @localtunnel/shared

Shared utilities for localtunnel packages.

## Features

- Environment file loading (.env support)
- Client configuration from args and environment variables
- Server configuration from args and environment variables

## Installation

```bash
bun add @localtunnel/shared
```

## Usage

### Load Environment File

```typescript
import { loadEnvFile } from "@localtunnel/shared";

await loadEnvFile(".env");
```

### Client Configuration

```typescript
import { getClientConfig } from "@localtunnel/shared";

const config = getClientConfig({
  port: 3000,
  subdomain: "myapp",
  host: "localtunnel.me",
});

// Configuration precedence: CLI args > Environment variables > Defaults
```

### Server Configuration

```typescript
import { getServerConfig } from "@localtunnel/shared";

const config = getServerConfig({
  host: "0.0.0.0",
  port: 8080,
});
```

## Environment Variables

### Client

| Variable                | Description                  | Default          |
| ----------------------- | ---------------------------- | ---------------- |
| `LT_PORT`               | Local port to tunnel         | -                |
| `LT_SUBDOMAIN`          | Request specific subdomain   | -                |
| `LT_HOST`               | Tunnel server hostname       | `localtunnel.me` |
| `LT_LOCAL_HOST`         | Proxy to different hostname  | -                |
| `LT_LOCAL_HTTPS`        | Enable HTTPS to local server | `false`          |
| `LT_LOCAL_CERT`         | Path to certificate          | -                |
| `LT_LOCAL_KEY`          | Path to key                  | -                |
| `LT_LOCAL_CA`           | Path to CA                   | -                |
| `LT_ALLOW_INVALID_CERT` | Skip cert validation         | `false`          |
| `LT_TLS`                | Enable TLS                   | `true`           |

### Server

| Variable         | Description       | Default   |
| ---------------- | ----------------- | --------- |
| `LT_SERVER_HOST` | Host to bind to   | `0.0.0.0` |
| `LT_SERVER_PORT` | Port to listen on | `8080`    |

## API

### loadEnvFile(envPath?: string)

Loads environment variables from a `.env` file.

```typescript
await loadEnvFile(".env"); // Load from .env file
await loadEnvFile(".env.prod"); // Load from .env.prod file
```

### getClientConfig(args?: ClientArgs)

Returns client configuration with environment variable fallback.

```typescript
interface ClientArgs {
  port?: number;
  subdomain?: string;
  host?: string;
  serverPort?: number;
  localHost?: string;
  localHttps?: boolean;
  localCert?: string;
  localKey?: string;
  localCa?: string;
  allowInvalidCert?: boolean;
  tls?: boolean;
}
```

### getServerConfig(args?: ServerArgs)

Returns server configuration with environment variable fallback.

```typescript
interface ServerArgs {
  host?: string;
  port?: number;
}
```
