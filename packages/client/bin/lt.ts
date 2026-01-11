#!/usr/bin/env bun
import { Effect } from "effect";
import { openTunnel } from "../src/client.js";

interface Args {
  port: number;
  subdomain?: string;
  host?: string;
  localHost?: string;
  localHttps?: boolean;
  localCert?: string;
  localKey?: string;
  localCa?: string;
  allowInvalidCert?: boolean;
  help: boolean;
}

const args = Bun.argv.slice(2);
const parsedArgs: Args = {
  port: 0,
  help: false,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const next = args[i + 1];

  if (arg === "--port" && next) {
    parsedArgs.port = parseInt(next, 10);
    i++;
  } else if (arg === "--subdomain" && next) {
    parsedArgs.subdomain = next;
    i++;
  } else if (arg === "--host" && next) {
    parsedArgs.host = next;
    i++;
  } else if (arg === "--local-host" && next) {
    parsedArgs.localHost = next;
    i++;
  } else if (arg === "--local-https") {
    parsedArgs.localHttps = true;
  } else if (arg === "--local-cert" && next) {
    parsedArgs.localCert = next;
    i++;
  } else if (arg === "--local-key" && next) {
    parsedArgs.localKey = next;
    i++;
  } else if (arg === "--local-ca" && next) {
    parsedArgs.localCa = next;
    i++;
  } else if (arg === "--allow-invalid-cert") {
    parsedArgs.allowInvalidCert = true;
  } else if (arg === "--help" || arg === "-h") {
    parsedArgs.help = true;
  }
}

if (parsedArgs.help) {
  console.log(`
localtunnel - Expose localhost to the world

Usage: lt [options]

Options:
  --port <n>              Local port to tunnel (required)
  --subdomain <name>      Request a specific subdomain
  --host <url>            Tunnel server URL (default: localtunnel.me)
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
  lt --port 443 --local-https
`);
  process.exit(0);
}

if (!parsedArgs.port) {
  console.error("Error: --port is required");
  console.error("Use --help for usage information");
  process.exit(1);
}

const tunnel = await Effect.runPromise(
  openTunnel(parsedArgs.port, {
    subdomain: parsedArgs.subdomain,
    host: parsedArgs.host,
    localHost: parsedArgs.localHost,
    localHttps: parsedArgs.localHttps,
    localCert: parsedArgs.localCert,
    localKey: parsedArgs.localKey,
    localCa: parsedArgs.localCa,
    allowInvalidCert: parsedArgs.allowInvalidCert,
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
