#!/usr/bin/env bun
import { startServer } from "../src/server.js";

interface Args {
  port: number;
  host?: string;
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
  } else if (arg === "--host" && next) {
    parsedArgs.host = next;
    i++;
  } else if (arg === "--help" || arg === "-h") {
    parsedArgs.help = true;
  }
}

if (parsedArgs.help) {
  console.log(`
localtunnel-server - Tunnel server

Usage: localtunnel-server [options]

Options:
  --port <n>    Port to listen on (required)
  --host <addr> Host to bind to (default: 0.0.0.0)
  --help, -h    Show this help

Examples:
  localtunnel-server --port 8080
  localtunnel-server --port 443 --host 0.0.0.0
`);
  process.exit(0);
}

if (!parsedArgs.port) {
  console.error("Error: --port is required");
  console.error("Use --help for usage information");
  process.exit(1);
}

console.log(`Starting localtunnel server on port ${parsedArgs.port}...`);

await startServer(parsedArgs.port, parsedArgs.host);

console.log("Server stopped");
