import { Context, Effect, Scope } from "effect";
import { ConnectionError, TunnelError } from "./errors";

export interface TunnelConfig {
  host: string;
  port?: number;
  tls?: boolean;
  subdomain?: string;
  localPort: number;
  localHost?: string;
  localHttps?: boolean;
  localCert?: string;
  localKey?: string;
  localCa?: string;
  allowInvalidCert?: boolean;
}

export interface TunnelService {
  openTunnel: (
    config: TunnelConfig,
  ) => Effect.Effect<string, ConnectionError | TunnelError, Scope.Scope>;
  closeTunnel: (url: string) => Effect.Effect<void, never, Scope.Scope>;
}

export { ConnectionError, TunnelError };
export const TunnelConfig = Context.GenericTag<TunnelConfig>("TunnelConfig");
export const TunnelService = Context.GenericTag<TunnelService>("TunnelService");
