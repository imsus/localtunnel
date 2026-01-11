import { Effect, Layer } from "effect";
import { ServerConfig, ServerService } from "./service";
import { ServerError } from "./errors";

const mockServerConfig: ServerConfig = {
  host: "0.0.0.0",
  port: 8080,
};

export const MockServerConfig = Layer.succeed(ServerConfig, mockServerConfig);

export const MockServerServiceSuccess = Layer.succeed(ServerService, {
  createServer: (_port: number, _host?: string) => Effect.succeed(undefined),
  startServer: (_port: number, _host?: string) => Effect.succeed(undefined),
});

export const MockServerServiceFailure = Layer.succeed(ServerService, {
  createServer: (_port: number, _host?: string) =>
    Effect.fail(new ServerError("EADDRINUSE: Port already in use")),
  startServer: (_port: number, _host?: string) =>
    Effect.fail(new ServerError("Failed to start server")),
});

export const MockLive = Layer.merge(MockServerConfig, MockServerServiceSuccess);
export const MockLiveFailure = Layer.merge(MockServerConfig, MockServerServiceFailure);
