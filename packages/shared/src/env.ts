/**
 * Environment variable loading utilities for localtunnel
 * Supports both client and server configuration via .env file
 */

export interface ClientConfig {
  port: number;
  subdomain?: string;
  host: string;
  serverPort?: number;
  localHost?: string;
  localHttps: boolean;
  localCert?: string;
  localKey?: string;
  localCa?: string;
  allowInvalidCert: boolean;
  tls: boolean;
}

export interface ServerConfig {
  host: string;
  port: number;
}

/**
 * Load .env file and populate process.env
 * @param envPath Path to .env file (default: ".env")
 */
export async function loadEnvFile(envPath = ".env"): Promise<void> {
  try {
    if (await Bun.file(envPath).exists()) {
      const envFile = await Bun.file(envPath).text();
      for (const line of envFile.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          if (key && valueParts.length) {
            process.env[key] = valueParts.join("=");
          }
        }
      }
    }
  } catch {
    // .env file not found or parse error, use defaults
  }
}

/**
 * Get client configuration from environment variables
 * CLI args take precedence over env vars
 */
export function getClientConfig(args: Partial<ClientConfig> = {}): ClientConfig {
  return {
    port: args.port ?? 0,
    subdomain: args.subdomain ?? process.env.LT_SUBDOMAIN,
    host: args.host ?? process.env.LT_HOST ?? "localtunnel.me",
    serverPort: args.serverPort,
    localHost: args.localHost ?? process.env.LT_LOCAL_HOST,
    localHttps: args.localHttps ?? process.env.LT_LOCAL_HTTPS === "true",
    localCert: args.localCert ?? process.env.LT_LOCAL_CERT,
    localKey: args.localKey ?? process.env.LT_LOCAL_KEY,
    localCa: args.localCa ?? process.env.LT_LOCAL_CA,
    allowInvalidCert: args.allowInvalidCert ?? process.env.LT_ALLOW_INVALID_CERT === "true",
    tls: args.tls ?? process.env.LT_TLS !== "false",
  };
}

/**
 * Get server configuration from environment variables
 */
export function getServerConfig(args: Partial<ServerConfig> = {}): ServerConfig {
  return {
    host: args.host ?? process.env.LT_SERVER_HOST ?? "0.0.0.0",
    port: args.port ?? parseInt(process.env.LT_SERVER_PORT ?? "8080", 10),
  };
}
