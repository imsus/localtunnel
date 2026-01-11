#!/usr/bin/env bun
import { loadEnvFile, getServerConfig } from "localtunnel-shared/env";

interface Args {
  port?: number;
  host?: string;
  help: boolean;
}

// Load .env file if it exists
await loadEnvFile();

const args = Bun.argv.slice(2);
const cliArgs: Args = {
  port: undefined,
  host: undefined,
  help: false,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const next = args[i + 1];

  if (arg === "--port" && next) {
    cliArgs.port = parseInt(next, 10);
    i++;
  } else if (arg === "--host" && next) {
    cliArgs.host = next;
    i++;
  } else if (arg === "--help" || arg === "-h") {
    cliArgs.help = true;
  }
}

if (cliArgs.help) {
  console.log(`
localtunnel-server - Localtunnel server

Usage: localtunnel-server [options]

Options:
  --port <n>     Server port (default: 8080)
  --host <addr>  Server host (default: 0.0.0.0)
  --help, -h     Show this help

Environment variables (from .env):
  LT_SERVER_PORT   Server port
  LT_SERVER_HOST   Server host

Examples:
  localtunnel-server --port 8080
  localtunnel-server --port 8080 --host 0.0.0.0
`);
  process.exit(0);
}

const config = getServerConfig(cliArgs);

console.log(`Starting localtunnel server on ${config.host}:${config.port}`);

const { startServer } = await import("../src/server.js");

startServer(config.port, config.host).catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
