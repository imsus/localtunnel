#!/usr/bin/env bun
import { Effect } from "effect";
import pino from "pino";
import pc from "picocolors";
import { openTunnel } from "../src/client";
import { loadEnvFile, getClientConfig } from "localtunnel-shared/env";

interface ClientState {
  startTime: number;
}

const _state: ClientState = {
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
  verbose: boolean;
  version: boolean;
  help: boolean;
  config?: string;
  logFormat: "json" | "pretty";
}

await loadEnvFile();

const args = Bun.argv.slice(2);
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
  verbose: false,
  version: false,
  help: false,
  config: undefined,
  logFormat: "pretty",
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
  } else if (arg === "--verbose" || arg === "-v") {
    cliArgs.verbose = true;
  } else if (arg === "--version" || arg === "-V") {
    cliArgs.version = true;
  } else if (arg === "--config" && next) {
    cliArgs.config = next;
    i++;
  } else if (arg === "--log-format" && next) {
    cliArgs.logFormat = next as "json" | "pretty";
    i++;
  } else if (arg === "--help" || arg === "-h") {
    cliArgs.help = true;
  }
}

const logger = createLogger(cliArgs.logFormat);

if (cliArgs.verbose) {
  logger.level = "debug";
}

if (cliArgs.config) {
  try {
    const fileConfig = JSON.parse(await Bun.file(cliArgs.config).text());
    cliArgs.port ??= fileConfig.port;
    cliArgs.subdomain ??= fileConfig.subdomain;
    cliArgs.host ??= fileConfig.host;
    cliArgs.serverPort ??= fileConfig.serverPort;
    cliArgs.localHost ??= fileConfig.localHost;
    cliArgs.localHttps ??= fileConfig.localHttps;
    cliArgs.localCert ??= fileConfig.localCert;
    cliArgs.localKey ??= fileConfig.localKey;
    cliArgs.localCa ??= fileConfig.localCa;
    cliArgs.allowInvalidCert ??= fileConfig.allowInvalidCert;
    cliArgs.tls ??= fileConfig.tls;
  } catch {
    logger.error("Failed to load config file: %s", cliArgs.config);
    process.exit(1);
  }
}

if (cliArgs.version) {
  const { version } = JSON.parse(await Bun.file("../../package.json").text());
  console.log(pc.cyan("lt") + pc.white(" v") + pc.green(version));
  process.exit(0);
}

if (cliArgs.help) {
  console.log(`
${pc.cyan("lt")} ${pc.white("v3.0.0")} - ${pc.dim("Expose localhost to the world")}

${pc.white("Usage:")} ${pc.yellow("lt")} ${pc.cyan("[options]")}

${pc.white("Options:")}
  ${pc.cyan("--port")} <n>              ${pc.white("Local port to tunnel")} ${pc.dim("(required)")}
  ${pc.cyan("--subdomain")} <name>      ${pc.white("Request a specific subdomain")}
  ${pc.cyan("--host")} <url>            ${pc.white("Tunnel server hostname")} ${pc.dim("(env: LT_HOST, default: localtunnel.me)")}
  ${pc.cyan("--server-port")} <n>       ${pc.white("Tunnel server port")} ${pc.dim("(env: LT_PORT, default: 443)")}
  ${pc.cyan("--local-host")} <name>     ${pc.white("Proxy to a different hostname")}
  ${pc.cyan("--local-https")}           ${pc.white("Enable HTTPS to local server")}
  ${pc.cyan("--local-cert")} <path>     ${pc.white("Path to certificate PEM file")}
  ${pc.cyan("--local-key")} <path>      ${pc.white("Path to certificate key file")}
  ${pc.cyan("--local-ca")} <path>       ${pc.white("Path to certificate authority file")}
  ${pc.cyan("--allow-invalid-cert")}    ${pc.white("Disable certificate validation")}
  ${pc.cyan("--no-tls")}                ${pc.white("Disable TLS for local testing")}
  ${pc.cyan("--config")} <path>         ${pc.white("Config file path")} ${pc.dim("(auto-loads: ./lt.json)")}
  ${pc.cyan("--log-format")} <fmt>      ${pc.white("Log format: json, pretty")} ${pc.dim("(default: pretty)")}
  ${pc.cyan("--verbose")}, ${pc.cyan("-v")}           ${pc.white("Enable debug logging")}
  ${pc.cyan("--version")}, ${pc.cyan("-V")}           ${pc.white("Show version")}
  ${pc.cyan("--help")}, ${pc.cyan("-h")}              ${pc.white("Show this help")}

${pc.white("Environment variables:")}
  ${pc.yellow("LT_PORT")}                 ${pc.dim("Local port to tunnel")}
  ${pc.yellow("LT_SUBDOMAIN")}            ${pc.dim("Request a specific subdomain")}
  ${pc.yellow("LT_HOST")}                 ${pc.dim("Tunnel server hostname (default: localtunnel.me)")}
  ${pc.yellow("LT_LOCAL_HOST")}           ${pc.dim("Proxy to a different hostname")}
  ${pc.yellow("LT_LOCAL_HTTPS")}          ${pc.dim("Enable HTTPS to local server (true/false)")}
  ${pc.yellow("LT_LOCAL_CERT")}           ${pc.dim("Path to certificate PEM file")}
  ${pc.yellow("LT_LOCAL_KEY")}            ${pc.dim("Path to certificate key file")}
  ${pc.yellow("LT_LOCAL_CA")}             ${pc.dim("Path to certificate authority file")}
  ${pc.yellow("LT_ALLOW_INVALID_CERT")}   ${pc.dim("Disable certificate validation (true/false)")}
  ${pc.yellow("LT_TLS")}                  ${pc.dim("Enable TLS (default: true)")}
  ${pc.yellow("LOG_LEVEL")}               ${pc.dim("Logging level: debug, info, warn, error (default: info)")}
  ${pc.yellow("NODE_ENV")}                ${pc.dim("Set to 'production' for JSON logs")}

${pc.white("Examples:")}
  ${pc.dim("$")} ${pc.yellow("lt --port 3000")}
  ${pc.dim("$")} ${pc.yellow("lt --port 8000 --subdomain myapp")}
  ${pc.dim("$")} ${pc.yellow("lt --port 8000 --host 127.0.0.1 --server-port 8000 --no-tls")}
  ${pc.dim("$")} ${pc.yellow("lt --port 443 --local-https")}
  ${pc.dim("$")} ${pc.yellow("LOG_LEVEL=debug lt --port 3000")}
`);
  process.exit(0);
}

if (!cliArgs.port) {
  console.error(pc.red("Error:") + " --port is required");
  console.error(pc.dim("Use ") + pc.yellow("--help") + pc.dim(" for usage information"));
  process.exit(1);
}

const config = getClientConfig(cliArgs);

logger.info({ port: config.port, host: config.host }, "Opening tunnel...");

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

logger.info({ url: tunnel.url }, "Tunnel established");

console.log(pc.green("Tunnel established at ") + pc.cyan(tunnel.url));

const shutdown = async (signal: string) => {
  logger.info("Closing tunnel (%s)...", signal);
  await tunnel.close();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

tunnel.close().then(() => {
  process.exit(0);
});
