import { Context, Effect } from "effect";

export interface ServerConfig {
  host: string;
  port: number;
}

export interface ServerService {
  createServer: (port: number, host?: string) => Effect.Effect<void, never, never>;
  startServer: (port: number, host?: string) => Effect.Effect<void, never, never>;
}

export const ServerConfig = Context.GenericTag<ServerConfig>("ServerConfig");
export const ServerService = Context.GenericTag<ServerService>("ServerService");
