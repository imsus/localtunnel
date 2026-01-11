import { Effect, Scope, Layer, Context } from "effect";
import * as net from "net";
import * as tls from "tls";
import { TunnelConfig, TunnelService } from "./service.js";
import { ConnectionError, TimeoutError, TunnelError, TunnelErrors } from "./errors.js";

export interface Tunnel {
  url: string;
  close: () => Promise<void>;
}

const connect = (host: string, port: number, useTls: boolean): Effect.Effect<net.Socket, ConnectionError, Scope> =>
  Effect.withScope((scope) =>
    Effect.gen(function* () {
      const socket = useTls ? tls.connect({ host, port }) : net.connect({ host, port });

      const onError = (reason: string) => new ConnectionError(host, port, reason);

      yield* Effect.addFinalizer(() => Effect.sync(() => socket.destroy()));

      const connected = yield* Effect.async<boolean, ConnectionError>((resume) => {
        socket.on("connect", () => resume(Effect.succeed(true)));
        socket.on("error", (err) => resume(Effect.fail(new ConnectionError(host, port, err.message))));
      });

      if (!connected) {
        return yield* Effect.fail(new ConnectionError(host, port, "Connection failed"));
      }

      return socket;
    })
  );

const requestTunnel = (
  socket: net.Socket,
  config: TunnelConfig
): Effect.Effect<{ url: string }, TunnelErrors, never> =>
  Effect.gen(function* () {
    const requestPath = config.subdomain
      ? `/?subdomain=${config.subdomain}`
      : "/";

    const headers = [
      `GET ${requestPath} HTTP/1.1`,
      `Host: ${config.host}`,
      "Connection: close",
      "",
      "",
    ].join("\r\n");

    socket.write(headers);

    const response = yield* Effect.async<string, TunnelError>((resume) => {
      let data = "";

      const onData = (chunk: Buffer) => {
        data += chunk.toString();
        const match = data.match(/url=(\S+)/);
        if (match) {
          socket.removeListener("data", onData);
          socket.removeListener("error", onError);
          resume(Effect.succeed(match[1]));
        }
      };

      const onError = (err: Error) => {
        socket.removeListener("data", onData);
        socket.removeListener("error", onError);
        resume(Effect.fail(new TunnelError(err.message)));
      };

      socket.on("data", onData);
      socket.on("error", onError);
    });

    return { url: response };
  });

const pipeData = (from: net.Socket, to: net.Socket): Effect.Effect<void, never, Scope> =>
  Effect.withScope((scope) =>
    Effect.gen(function* () {
      from.on("data", (chunk) => {
        if (!to.destroyed) {
          to.write(chunk);
        }
      });

      from.on("close", () => {
        to.end();
      });

      from.on("error", () => {
        to.destroy();
      });
    })
  );

const connectLocal = (
  port: number,
  host: string | undefined,
  useHttps: boolean,
  options: {
    cert?: string;
    key?: string;
    ca?: string;
    allowInvalidCert?: boolean;
  }
): Effect.Effect<net.Socket, ConnectionError, Scope> =>
  Effect.withScope((scope) =>
    Effect.gen(function* () {
      const targetHost = host ?? "localhost";
      const socketOptions = useHttps
        ? {
            host: targetHost,
            port,
            rejectUnauthorized: !options.allowInvalidCert,
            cert: options.cert,
            key: options.key,
            ca: options.ca,
          }
        : { host: targetHost, port };

      const socket = useHttps ? tls.connect(socketOptions) : net.connect(socketOptions);

      yield* Effect.addFinalizer(() => Effect.sync(() => socket.destroy()));

      const connected = yield* Effect.async<boolean, ConnectionError>((resume) => {
        socket.on("connect", () => resume(Effect.succeed(true)));
        socket.on("error", (err) => resume(Effect.fail(new ConnectionError(targetHost, port, err.message))));
      });

      if (!connected) {
        return yield* Effect.fail(new ConnectionError(targetHost, port, "Local connection failed"));
      }

      return socket;
    })
  );

export const openTunnel = (
  port: number,
  opts?: Partial<TunnelConfig>
): Effect.Effect<Tunnel, TunnelErrors, Scope> =>
  Effect.withScope((scope) =>
    Effect.gen(function* () {
      const config: TunnelConfig = {
        host: "localtunnel.me",
        localPort: port,
        ...opts,
      };

      const serverSocket = yield* connect(config.host, 443, true);
      const { url } = yield* requestTunnel(serverSocket, config);

      const localSocket = yield* connectLocal(config.localPort, config.localHost, config.localHttps ?? false, {
        cert: config.localCert,
        key: config.localKey,
        ca: config.localCa,
        allowInvalidCert: config.allowInvalidCert,
      });

      yield* Effect.fork(scope, pipeData(serverSocket, localSocket));
      yield* Effect.fork(scope, pipeData(localSocket, serverSocket));

      return {
        url,
        close: () =>
          Effect.runPromise(
            Effect.all([Effect.sync(() => serverSocket.end()), Effect.sync(() => localSocket.end())])
          ),
      };
    })
  );

export const openTunnelWithRetry = (
  port: number,
  opts?: Partial<TunnelConfig>,
  retries = 3,
  delay = 1000
): Effect.Effect<Tunnel, TunnelErrors, Scope> =>
  openTunnel(port, opts).pipe(
    Effect.retry({ times: retries, delay })
  );
