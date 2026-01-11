import { Effect, Stream, Fiber, Scope, Schedule, PubSub } from "effect";
import * as net from "net";
import * as tls from "tls";
import { TunnelConfig } from "./service.js";
import { ConnectionError, TunnelError, TunnelErrors } from "./errors.js";
import { HeaderHostTransformer } from "./HeaderHostTransformer.js";

export interface Tunnel {
  url: string;
  close: () => Promise<void>;
  onRequest: (listener: (info: { method: string; path: string }) => void) => void;
}

export interface RequestInfo {
  method: string;
  path: string;
}

export interface TunnelInfo {
  name: string;
  url: string;
  cached_url?: string;
  max_conn: number;
  remote_host: string;
  remote_ip?: string;
  remote_port: number;
  local_port: number;
  local_host?: string;
  local_https?: boolean;
  local_cert?: string;
  local_key?: string;
  local_ca?: string;
  allow_invalid_cert?: boolean;
}

const connect = (
  host: string,
  port: number,
  useTls: boolean,
): Effect.Effect<net.Socket, ConnectionError> =>
  Effect.gen(function* () {
    const socket = useTls ? tls.connect({ host, port }) : net.connect({ host, port });

    const connected = yield* Effect.async<boolean, ConnectionError>((resume) => {
      socket.on("connect", () => resume(Effect.succeed(true)));
      socket.on("error", (err) =>
        resume(Effect.fail(new ConnectionError(host, port, err.message))),
      );
    });

    if (!connected) {
      return yield* Effect.fail(new ConnectionError(host, port, "Connection failed"));
    }

    return socket;
  });

const requestTunnel = (
  socket: net.Socket,
  config: TunnelConfig,
): Effect.Effect<{ url: string }, TunnelErrors> =>
  Effect.gen(function* () {
    const requestPath = config.subdomain ? `/?subdomain=${config.subdomain}` : "/";

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

const pipeData = (from: net.Socket, to: net.Socket): void => {
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
};

const connectLocal = (
  port: number,
  host: string | undefined,
  useHttps: boolean,
  options: {
    cert?: string;
    key?: string;
    ca?: string;
    allowInvalidCert?: boolean;
  },
): Effect.Effect<net.Socket, ConnectionError> =>
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

    const connected = yield* Effect.async<boolean, ConnectionError>((resume) => {
      socket.on("connect", () => resume(Effect.succeed(true)));
      socket.on("error", (err) =>
        resume(Effect.fail(new ConnectionError(targetHost, port, err.message))),
      );
    });

    if (!connected) {
      return yield* Effect.fail(new ConnectionError(targetHost, port, "Local connection failed"));
    }

    return socket;
  });

export const openTunnel = (
  port: number,
  opts?: Partial<TunnelConfig>,
): Effect.Effect<Tunnel, TunnelErrors> =>
  Effect.gen(function* () {
    const config: TunnelConfig = {
      host: "localtunnel.me",
      localPort: port,
      ...opts,
    };

    const serverSocket = yield* connect(config.host, 443, true);
    const { url } = yield* requestTunnel(serverSocket, config);

    const localSocket = yield* connectLocal(
      config.localPort,
      config.localHost,
      config.localHttps ?? false,
      {
        cert: config.localCert,
        key: config.localKey,
        ca: config.localCa,
        allowInvalidCert: config.allowInvalidCert,
      },
    );

    pipeData(serverSocket, localSocket);
    pipeData(localSocket, serverSocket);

    return {
      url,
      close: () =>
        Effect.runPromise(
          Effect.all([Effect.sync(() => serverSocket.end()), Effect.sync(() => localSocket.end())]),
        ),
    };
  });

export const openTunnelWithRetry = (
  port: number,
  opts?: Partial<TunnelConfig>,
  retries = 3,
  delay = 1000,
): Effect.Effect<Tunnel, TunnelErrors> =>
  openTunnel(port, opts).pipe(Effect.retry({ times: retries, delay }));

const fetchTunnelInfo = (
  config: TunnelConfig,
): Effect.Effect<TunnelInfo, TunnelErrors> =>
  Effect.gen(function* () {
    const baseUri = config.host.endsWith("/") ? config.host : `${config.host}/`;
    const uri = config.subdomain ? `${baseUri}?subdomain=${config.subdomain}` : `${baseUri}?new`;

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(uri, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }),
      catch: (err) => new ConnectionError(config.host, 443, err.message),
    });

    if (!response.ok) {
      const body = yield* Effect.tryPromise({
        try: () => response.text(),
        catch: () => new TunnelError("Failed to read response body"),
      });
      return yield* Effect.fail(
        new TunnelError(body || `Server returned ${response.status}`),
      );
    }

    const data = yield* Effect.tryPromise({
      try: () => response.json() as Promise<{
        id: string;
        ip?: string;
        port: number;
        url: string;
        cached_url?: string;
        max_conn_count?: number;
      }>,
      catch: (err) => new TunnelError(err.message),
    });

    const remoteHostOrIp = data.ip || config.host;
    const remotePort = data.port;

    return {
      name: data.id,
      url: data.url,
      cached_url: data.cached_url,
      max_conn: data.max_conn_count || 1,
      remote_host: config.host,
      remote_ip: data.ip,
      remote_port: data.port,
      local_port: config.localPort,
      local_host: config.localHost,
      local_https: config.localHttps,
      local_cert: config.localCert,
      local_key: config.localKey,
      local_ca: config.localCa,
      allow_invalid_cert: config.allowInvalidCert,
    };
  });

const fetchTunnelInfoWithRetry = (
  config: TunnelConfig,
  retries = 3,
  delay = 1000,
): Effect.Effect<TunnelInfo, TunnelErrors> =>
  fetchTunnelInfo(config).pipe(
    Effect.retry({
      times: retries,
      schedule: Schedule.exponential(delay),
    }),
  );

const openSingleTunnel = (
  info: TunnelInfo,
  requestPubSub: PubSub.PubSub<RequestInfo>,
): Effect.Effect<{ socket: net.Socket; local: net.Socket }, TunnelErrors> =>
  Effect.gen(function* () {
    const remoteHostOrIp = info.remote_ip || info.remote_host;
    const remotePort = info.remote_port;
    const localHost = info.local_host || "localhost";
    const localPort = info.local_port;
    const localProtocol = info.local_https ? "https" : "http";
    const allowInvalidCert = info.allow_invalid_cert;

    const remote = yield* connect(remoteHostOrIp, remotePort, true);

    remote.on("data", (data) => {
      const text = data.toString();
      const match = text.match(/^(\w+) (\S+)/);
      if (match) {
        PubSub.publish(requestPubSub, { method: match[1], path: match[2] });
      }
    });

    remote.on("error", (err) => {
      if (err.code === "ECONNREFUSED") {
        remote.end();
      }
    });

    const local = yield* connectLocal(localPort, localHost, info.local_https ?? false, {
      cert: info.local_cert,
      key: info.local_key,
      ca: info.local_ca,
      allowInvalidCert: info.allow_invalid_cert,
    });

    let stream: net.Socket | NodeJS.WritableStream = remote;

    if (info.local_host) {
      const transformer = HeaderHostTransformer.create(info.local_host);
      stream = remote.pipe(transformer.transform(remote) as any) as any;
    }

    stream.pipe(local).pipe(remote);

    return { socket: remote, local };
  });

const establishTunnels = (
  info: TunnelInfo,
  requestPubSub: PubSub.PubSub<RequestInfo>,
): Effect.Effect<net.Socket[], TunnelErrors> =>
  Effect.gen(function* () {
    const tunnelCount = info.max_conn || 1;
    const tunnels = yield* Effect.all(
      Array.from({ length: tunnelCount }, () => openSingleTunnel(info, requestPubSub)),
    );

    return tunnels.map((t) => t.socket);
  });

export const openTunnelCluster = (
  port: number,
  opts?: Partial<TunnelConfig>,
): Effect.Effect<Tunnel, TunnelErrors> =>
  Effect.gen(function* () {
    const config: TunnelConfig = {
      host: "localtunnel.me",
      localPort: port,
      ...opts,
    };

    const requestPubSub = yield* PubSub.bounded<RequestInfo>(100);
    const info = yield* fetchTunnelInfoWithRetry(config);

    const sockets = yield* establishTunnels(info, requestPubSub);

    const closeAll = Effect.all(
      sockets.map((s) => Effect.sync(() => s.end())),
    );

    return {
      url: info.url,
      close: () => Effect.runPromise(closeAll),
      onRequest: (listener) => {
        Effect.runFork(
          Stream.runForEach(
            PubSub.subscribe(requestPubSub),
            (info) => Effect.sync(() => listener(info)),
          ),
        );
      },
    };
  });
