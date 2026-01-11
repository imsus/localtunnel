import { Context, Effect, Scope } from "effect";
import { ServerError } from "./errors";

export interface ServerConfig {
  host: string;
  port: number;
}

export interface ServerService {
  createServer: (port: number, host?: string) => Effect.Effect<void, ServerError, Scope.Scope>;
  startServer: (port: number, host?: string) => Effect.Effect<void, ServerError, Scope.Scope>;
}

export { ServerError };
export const ServerConfig = Context.GenericTag<ServerConfig>("ServerConfig");
export const ServerService = Context.GenericTag<ServerService>("ServerService");
