# AI Agents Integration Guide

This document describes how AI agents and automated systems can interact with localtunnel.

## Overview

localtunnel provides a simple way to expose localhost services to the internet, making it ideal for:

- AI agents needing webhook callbacks
- Automated testing requiring public URLs
- Remote debugging sessions
- CI/CD pipeline integrations

## Quick Start for Agents

```bash
# Expose a local service on port 3000
lt --port 3000

# With custom subdomain
lt --port 3000 --subdomain my-agent-task-123

# Disable TLS for local testing
lt --port 8080 --no-tls
```

## Environment Variables

Agents can configure localtunnel via environment variables:

| Variable                | Description                  | Default          |
| ----------------------- | ---------------------------- | ---------------- |
| `LT_PORT`               | Local port to tunnel         | -                |
| `LT_SUBDOMAIN`          | Request a specific subdomain | -                |
| `LT_HOST`               | Tunnel server hostname       | `localtunnel.me` |
| `LT_LOCAL_HOST`         | Proxy to different hostname  | -                |
| `LT_LOCAL_HTTPS`        | Enable HTTPS to local server | `false`          |
| `LT_TLS`                | Enable TLS                   | `true`           |
| `LT_ALLOW_INVALID_CERT` | Skip cert validation         | `false`          |

Example `.env` file:
```bash
LT_PORT=3000
LT_SUBDOMAIN=agent-webhook-abc123
LT_HOST=my-tunnel-server.com
```

## Programmatic Usage

### Node.js / Bun

```typescript
import { openTunnel } from "@localtunnel/client";

const tunnel = await openTunnel(3000, {
  subdomain: "agent-task-123",
  host: "localtunnel.me",
});

console.log("Tunnel URL:", tunnel.url);

// Listen for requests
tunnel.onRequest(({ method, path }) => {
  console.log(`${method} ${path}`);
});

// Clean up
await tunnel.close();
```

### Python (via subprocess)

```python
import subprocess
import json
import time

# Start tunnel
proc = subprocess.Popen(
    ["lt", "--port", "8000", "--subdomain", "my-agent-task"],
    stdout=subprocess.PIPE,
    text=True
)

# Parse URL from output
time.sleep(2)
# URL will be printed: "Tunnel established at http://my-agent-task.loca.lt"

# Send URL to remote system
tunnel_url = "http://my-agent-task.loca.lt"
# ...

proc.terminate()
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Expose localhost for testing
  run: |
    lt --port 3000 --subdomain pr-${{ github.pr.number }} &
    TUNNEL_PID=$!
    echo "TUNNEL_URL=http://pr-${{ github.pr.number }}.loca.lt" >> $GITHUB_ENV
    # Run tests that need the tunnel
    # ...
    kill $TUNNEL_PID
```

### Automated Testing

```typescript
// Test that your AI agent's webhook works publicly
import { openTunnel } from "@localtunnel/client";

const tunnel = await openTunnel(3000);

const webhookUrl = tunnel.url;
console.log(`Share this URL: ${webhookUrl}`);

// Your AI agent can now send callbacks to this URL
// ...

await tunnel.close();
```

## Security Considerations

1. **Temporary tunnels**: Tunnels exist only while the process runs
2. **Subdomain uniqueness**: Each tunnel gets a unique URL
3. **Certificate validation**: Use `LT_ALLOW_INVALID_CERT=false` in production
4. **Rate limiting**: Server may impose limits on tunnel creation

## Troubleshooting

### Tunnel fails to establish

```bash
# Check port is accessible
lt --port 3000 --host 127.0.0.1 --server-port 8080 --no-tls

# Check firewall allows outbound connections
curl -I https://localtunnel.me
```

### Subdomain not available

```bash
# Let server assign random subdomain
lt --port 3000
```

### Connection timeout

```bash
# Increase timeout or check network
lt --port 3000 --local-host localhost
```

## Support

- Issues: GitHub Issues
- Docs: [README.md](./README.md)
