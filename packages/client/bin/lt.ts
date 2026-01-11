#!/usr/bin/env bun
import { Effect } from "effect";
import { openTunnel } from "../src/client";
import { loadEnvFile, getClientConfig } from "localtunnel-shared/env";

// Load .env file if it exists
await loadEnvFile();

interface Args {
  port: number;
  subdomain?: string;
  host?: string;
  serverPort?: number;
  localHost?: string;
  localHttps: boolean;
  localCert?: string;
  localKey?: string;
  localCa?: string;
  allowInvalidCert: boolean;
  tls: boolean;
  help: boolean;
}

const args = Bun.argv.slice(2);

interface Args {
  port: number;
  subdomain?: string;
  host?: string;
  serverPort?: number;
  localHost?: string;
  localHttps: boolean;
  localCert?: string;
  localKey?: string;
  localCa?: string;
  allowInvalidCert: boolean;
  tls: boolean;
  help: boolean;
}

const cliArgs: Args = {
  port: 0,
  subdomain: undefined,
  host: undefined,
  serverPort: undefined,
  localHost: undefined,
  localHttps: false,
  localCert: undefined,
  localKey: undefined,
  localCa: undefined,
  allowInvalidCert: false,
  tls: true,
  help: false,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const next = args[i + 1];

  if (arg === "--port" && next) {
    cliArgs.port = parseInt(next, 10);
    i++;
  } else if (arg === "--subdomain" && next) {
    cliArgs.subdomain = next;
    i++;
  } else if (arg === "--host" && next) {
    cliArgs.host = next;
    i++;
  } else if (arg === "--server-port" && next) {
    cliArgs.serverPort = parseInt(next, 10);
    i++;
  } else if (arg === "--local-host" && next) {
    cliArgs.localHost = next;
    i++;
  } else if (arg === "--local-https") {
    cliArgs.localHttps = true;
  } else if (arg === "--local-cert" && next) {
    cliArgs.localCert = next;
    i++;
  } else if (arg === "--local-key" && next) {
    cliArgs.localKey = next;
    i++;
  } else if (arg === "--local-ca" && next) {
    cliArgs.localCa = next;
    i++;
  } else if (arg === "--allow-invalid-cert") {
    cliArgs.allowInvalidCert = true;
  } else if (arg === "--no-tls") {
    cliArgs.tls = false;
  } else if (arg === "--help" || arg === "-h") {
    cliArgs.help = true;
  }
}

if (cliArgs.help) {
  console.log(`
localtunnel - Expose localhost to the world

Usage: lt [options]

Options:
  --port <n>              Local port to tunnel (required)
  --subdomain <name>      Request a specific subdomain
  --host <url>            Tunnel server hostname (default: localtunnel.me)
  --server-port <n>       Tunnel server port (default: 443)
  --no-tls               Disable TLS for local testing
  --local-host <name>     Proxy to a different hostname
  --local-https          Enable HTTPS to local server
  --local-cert <path>     Path to certificate PEM file
  --local-key <path>      Path to certificate key file
  --local-ca <path>       Path to certificate authority file
  --allow-invalid-cert   Disable certificate validation
  --help, -h             Show this help

Examples:
  lt --port 3000
  lt --port 8000 --subdomain myapp
  lt --port 8000 --host 127.0.0.1 --server-port 8000 --no-tls
  lt --port 443 --local-https
`);
  process.exit(0);
}

if (!cliArgs.port) {
  console.error("Error: --port is required");
  console.error("Use --help for usage information");
  process.exit(1);
}

const config = getClientConfig(cliArgs);

const tunnel = await Effect.runPromise(
  openTunnel(config.port, {
    subdomain: config.subdomain,
    host: config.host,
    port: config.serverPort,
    tls: config.tls,
    localHost: config.localHost,
    localHttps: config.localHttps,
    localCert: config.localCert,
    localKey: config.localKey,
    localCa: config.localCa,
    allowInvalidCert: config.allowInvalidCert,
  }),
);

console.log("Tunnel established at " + tunnel.url);

tunnel.close().then(() => {
  process.exit(0);
});

process.on("SIGINT", async () => {
  await tunnel.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await tunnel.close();
  process.exit(0);
});
