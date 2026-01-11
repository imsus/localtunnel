import { Effect, Layer } from "effect";
import { TunnelConfig, TunnelService } from "./service.js";
import { ConnectionError, TunnelError } from "./errors.js";
import type { Tunnel } from "./client.js";

const mockTunnelConfig: TunnelConfig = {
  host: "mock.localtunnel.me",
  localPort: 3000,
};

const mockTunnel: Tunnel = {
  url: "http://abcd.mock.localtunnel.me",
  close: async () => {},
  onRequest: () => {},
};

export const MockTunnelConfig = Layer.succeed(TunnelConfig, mockTunnelConfig);

export const MockTunnelServiceSuccess = Layer.succeed(TunnelService, {
  openTunnel: (_config: TunnelConfig) =>
    Effect.succeed(mockTunnel),
  closeTunnel: (_url: string) =>
    Effect.succeed(undefined),
});

export const MockTunnelServiceFailure = Layer.succeed(TunnelService, {
  openTunnel: (_config: TunnelConfig) =>
    Effect.fail(new ConnectionError("mock.host", 443, "ECONNREFUSED")),
  closeTunnel: (_url: string) =>
    Effect.succeed(undefined),
});

export const MockTunnelServiceTimeout = Layer.succeed(TunnelService, {
  openTunnel: (_config: TunnelConfig) =>
    Effect.fail(new TunnelError("Connection timeout")),
  closeTunnel: (_url: string) =>
    Effect.succeed(undefined),
});

export const MockLive = Layer.merge(MockTunnelConfig, MockTunnelServiceSuccess);

export const MockLiveFailure = Layer.merge(
  MockTunnelConfig,
  MockTunnelServiceFailure,
);

export const MockLiveTimeout = Layer.merge(
  MockTunnelConfig,
  MockTunnelServiceTimeout,
);
