#!/usr/bin/env bun
import pino from "pino";
import pc from "picocolors";
import { loadEnvFile, getServerConfig } from "localtunnel-shared/env";

interface ServerState {
  activeTunnels: number;
  connections: number;
  startTime: number;
}

const state: ServerState = {
  activeTunnels: 0,
  connections: 0,
  startTime: Date.now(),
};

function createLogger(logFormat: "json" | "pretty" = "pretty") {
  const transport =
    logFormat === "pretty" && process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } }
      : undefined;

  return pino({
    level: process.env.LOG_LEVEL ?? "info",
    transport,
  });
}

interface Args {
  port?: number;
  host?: string;
  verbose: boolean;
  version: boolean;
  help: boolean;
  adminPort?: number;
  config?: string;
  logFormat: "json" | "pretty";
  pidFile?: string;
}

async function loadConfigFile(path: string, explicit: boolean): Promise<Partial<Args>> {
  try {
    const content = await Bun.file(path).text();
    const ext = path.split(".").pop();
    if (ext === "json" || ext === "cjs" || ext === "mjs") {
      return JSON.parse(content);
    }
    if (explicit) {
      logger.warn("Unsupported config file format: %s", ext);
    }
    return {};
  } catch {
    if (explicit) {
      logger.error("Failed to load config file: %s", path);
    }
    return {};
  }
}

async function writePidFile(path: string) {
  try {
    await Bun.write(path, `${process.pid}\n`);
    logger.info("PID file written: %s", path);
  } catch (err) {
    logger.error({ err }, "Failed to write PID file");
  }
}

function startAdminServer(port: number, logger: pino.Logger) {
  const server = Bun.serve({
    port,
    fetch(_req) {
      const uptime = Math.floor((Date.now() - state.startTime) / 1000);
      const json = JSON.stringify({
        uptime_seconds: uptime,
        active_tunnels: state.activeTunnels,
        connections: state.connections,
        memory_usage: process.memoryUsage(),
      });
      return new Response(json, {
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  logger.info("Admin server listening on http://localhost:%d", port);
  return server;
}

await loadEnvFile();

const args = Bun.argv.slice(2);
const cliArgs: Args = {
  port: undefined,
  host: undefined,
  verbose: false,
  version: false,
  help: false,
  adminPort: undefined,
  config: undefined,
  logFormat: "pretty",
  pidFile: undefined,
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
  } else if (arg === "--verbose" || arg === "-v") {
    cliArgs.verbose = true;
  } else if (arg === "--version" || arg === "-V") {
    cliArgs.version = true;
  } else if (arg === "--help" || arg === "-h") {
    cliArgs.help = true;
  } else if (arg === "--admin-port" && next) {
    cliArgs.adminPort = parseInt(next, 10);
    i++;
  } else if (arg === "--config" && next) {
    cliArgs.config = next;
    i++;
  } else if (arg === "--log-format" && next) {
    cliArgs.logFormat = next as "json" | "pretty";
    i++;
  } else if (arg === "--pid" && next) {
    cliArgs.pidFile = next;
    i++;
  }
}

const logger = createLogger(cliArgs.logFormat);

const defaultConfigPaths = ["localtunnel-server.json", "/etc/localtunnel/server.json"];
const configToLoad = cliArgs.config ?? defaultConfigPaths.find((p) => Bun.file(p).exists());
if (configToLoad) {
  const fileConfig = await loadConfigFile(configToLoad, !!cliArgs.config);
  cliArgs.port ??= fileConfig.port;
  cliArgs.host ??= fileConfig.host;
  cliArgs.adminPort ??= fileConfig.adminPort;
  cliArgs.pidFile ??= fileConfig.pidFile;
}

if (cliArgs.verbose) {
  logger.level = "debug";
}

if (cliArgs.version) {
  const { version } = JSON.parse(await Bun.file("../../package.json").text());
  console.log(pc.cyan("localtunnel-server") + pc.white(" v") + pc.green(version));
  process.exit(0);
}

if (cliArgs.help) {
  console.log(`
${pc.cyan("localtunnel-server")} ${pc.white("v3.0.0")} - ${pc.dim("Localtunnel server")}

${pc.white("Usage:")} ${pc.yellow("localtunnel-server")} ${pc.cyan("[options]")}

${pc.white("Options:")}
  ${pc.cyan("--port")} <n>           ${pc.white("Server port")} ${pc.dim("(env: LT_SERVER_PORT, default: 8080)")}
  ${pc.cyan("--host")} <addr>        ${pc.white("Server host")} ${pc.dim("(env: LT_SERVER_HOST, default: 0.0.0.0)")}
  ${pc.cyan("--admin-port")} <n>     ${pc.white("Admin API port for metrics")} ${pc.dim("(default: off)")}
  ${pc.cyan("--config")} <path>      ${pc.white("Config file path")} ${pc.dim("(auto-loads: ./localtunnel-server.json)")}
  ${pc.cyan("--log-format")} <fmt>   ${pc.white("Log format: json, pretty")} ${pc.dim("(default: pretty)")}
  ${pc.cyan("--pid")} <path>         ${pc.white("Write PID to file")}
  ${pc.cyan("--verbose")}, ${pc.cyan("-v")}        ${pc.white("Enable debug logging")}
  ${pc.cyan("--version")}, ${pc.cyan("-V")}        ${pc.white("Show version")}
  ${pc.cyan("--help")}, ${pc.cyan("-h")}           ${pc.white("Show this help")}

${pc.white("Environment variables:")}
  ${pc.yellow("LT_SERVER_PORT")}       ${pc.dim("Server port (default: 8080)")}
  ${pc.yellow("LT_SERVER_HOST")}       ${pc.dim("Server host (default: 0.0.0.0)")}
  ${pc.yellow("LOG_LEVEL")}            ${pc.dim("Logging level: debug, info, warn, error (default: info)")}
  ${pc.yellow("NODE_ENV")}             ${pc.dim("Set to 'production' for JSON logs")}

${pc.white("Examples:")}
  ${pc.dim("$")} ${pc.yellow("localtunnel-server")}
  ${pc.dim("$")} ${pc.yellow("localtunnel-server --port 8080 --host 0.0.0.0")}
  ${pc.dim("$")} ${pc.yellow("localtunnel-server --admin-port 9000")}
  ${pc.dim("$")} ${pc.yellow("localtunnel-server --config /etc/localtunnel/server.json")}
  ${pc.dim("$")} ${pc.yellow("LOG_LEVEL=debug localtunnel-server")}
`);
  process.exit(0);
}

const config = getServerConfig(cliArgs);

if (cliArgs.pidFile) {
  await writePidFile(cliArgs.pidFile);
}

logger.info({ host: config.host, port: config.port }, "Starting localtunnel server");

let adminServer: ReturnType<typeof Bun.serve> | undefined;
if (cliArgs.adminPort) {
  adminServer = startAdminServer(cliArgs.adminPort, logger);
}

const shutdown = async (signal: string) => {
  logger.info("Shutting down server (%s)...", signal);
  if (adminServer) {
    adminServer.stop();
  }
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const { startServer } = await import("../src/server");

startServer(config.port, config.host).catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
