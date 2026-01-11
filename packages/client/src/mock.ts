import { Effect, Layer } from "effect";
import { TunnelConfig, TunnelService } from "./service";
import { ConnectionError, TunnelError } from "./errors";

const mockTunnelConfig: TunnelConfig = {
  host: "mock.localtunnel.me",
  localPort: 3000,
};

export const MockTunnelConfig = Layer.succeed(TunnelConfig, mockTunnelConfig);

export const MockTunnelServiceSuccess = Layer.succeed(TunnelService, {
  openTunnel: (_config: TunnelConfig) => Effect.succeed("http://abcd.mock.localtunnel.me"),
  closeTunnel: (_url: string) => Effect.succeed(undefined),
});

export const MockTunnelServiceFailure = Layer.succeed(TunnelService, {
  openTunnel: (_config: TunnelConfig) =>
    Effect.fail(new ConnectionError("mock.host", 443, "ECONNREFUSED")).pipe(
      Effect.catchAll(() => Effect.succeed("")),
    ),
  closeTunnel: (_url: string) => Effect.succeed(undefined),
});

export const MockTunnelServiceTimeout = Layer.succeed(TunnelService, {
  openTunnel: (_config: TunnelConfig) =>
    Effect.fail(new TunnelError("Connection timeout")).pipe(
      Effect.catchAll(() => Effect.succeed("")),
    ),
  closeTunnel: (_url: string) => Effect.succeed(undefined),
});

export const MockLive = Layer.merge(MockTunnelConfig, MockTunnelServiceSuccess);

export const MockLiveFailure = Layer.merge(MockTunnelConfig, MockTunnelServiceFailure);

export const MockLiveTimeout = Layer.merge(MockTunnelConfig, MockTunnelServiceTimeout);
