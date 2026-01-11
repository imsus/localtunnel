import { Context } from "effect";

export interface TunnelConfig {
  host: string;
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
  openTunnel: (config: TunnelConfig) => Promise<string>;
  closeTunnel: (url: string) => Promise<void>;
}

export const TunnelConfig = Context.GenericTag<TunnelConfig>("TunnelConfig");
export const TunnelService = Context.GenericTag<TunnelService>("TunnelService");
