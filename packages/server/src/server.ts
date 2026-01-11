import { Effect, Scope } from "effect";
import * as net from "net";
import { ServerError, ClientError, ServerErrors } from "./errors";

export interface ServerConfig {
  host: string;
  port: number;
}

export type { ServerErrors } from "./errors";

const CHARS = "abcdefghijklmnopqrstuvwxyz";

const generateId = (): string => {
  let id = "";
  for (let i = 0; i < 4; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return id;
};

const parsePathSubdomain = (path: string): string | null => {
  const match = path.match(/^\/([a-z0-9]+)(\/|$)/);
  return match ? (match[1] ?? null) : null;
};

interface ClientConnection {
  socket: net.Socket;
  activeRequest: boolean;
}

interface WaitingRequest {
  clientId: string;
}

interface TunnelServer {
  clientId: string;
  url: string;
  port: number;
  cleanup: () => void;
}

const createTunnelServer = (
  port: number,
  origin: string,
  requestedClientId?: string,
): TunnelServer => {
  const clientId = requestedClientId ?? generateId();
  const tunnelServer = net.createServer();
  const url = `http://${clientId}.${origin}`;

  tunnelServer.listen(0, () => {
    const address = tunnelServer.address();
    if (address && typeof address === "object" && "port" in address) {
      (tunnelServer as any)._port = address.port;
    }
  });

  const cleanup = () => {
    tunnelServer.close();
  };

  return {
    clientId,
    url,
    port: (tunnelServer as any)._port || port,
    cleanup,
  };
};

const parseClientHandshake = (socket: net.Socket): Effect.Effect<string, ClientError> =>
  Effect.async<string, ClientError>((resume) => {
    let data = "";

    const onData = (chunk: Buffer) => {
      data += chunk.toString();
      const match = data.match(/GET \/\?(\w+)/);
      if (match && match[1]) {
        socket.removeListener("data", onData);
        socket.removeListener("error", onError);
        resume(Effect.succeed(match[1]));
      }
    };

    const onError = (err: Error) => {
      socket.removeListener("data", onData);
      socket.removeListener("error", onError);
      resume(Effect.fail(new ClientError(err.message)));
    };

    socket.on("data", onData);
    socket.on("error", onError);

    const timeout = setTimeout(() => {
      if (!data) {
        socket.removeListener("data", onData);
        socket.removeListener("error", onError);
        resume(Effect.fail(new ClientError("Handshake timeout")));
      }
    }, 5000);

    socket.once("close", () => clearTimeout(timeout));
  });

const handleClientConnection = (
  socket: net.Socket,
  clients: Map<string, ClientConnection>,
  waitLists: Map<string, WaitingRequest[]>,
): Effect.Effect<void, never, Scope.Scope> =>
  Effect.gen(function* () {
    const clientId = yield* parseClientHandshake(socket).pipe(
      Effect.orElseSucceed(() => generateId()),
    );

    clients.set(clientId, { socket, activeRequest: false });
    waitLists.set(clientId, []);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        clients.delete(clientId);
        socket.destroy();
      }),
    );

    socket.on("data", (_chunk: Buffer) => {
      const client = clients.get(clientId);
      if (!client) return;

      if (client.activeRequest) {
        waitLists.get(clientId)!.push({ clientId });
        socket.pause();
        return;
      }

      client.activeRequest = true;
    });

    socket.on("close", () => {
      clients.delete(clientId);
    });

    socket.on("error", () => {
      clients.delete(clientId);
    });
  });

const createHttpServer = (
  port: number,
  host = "0.0.0.0",
): Effect.Effect<void, ServerErrors, Scope.Scope> =>
  Effect.gen(function* () {
    const clients = new Map<string, ClientConnection>();
    const waitLists = new Map<string, WaitingRequest[]>();
    const tunnelServers = new Map<string, TunnelServer>();

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        for (const client of clients.values()) {
          client.socket.destroy();
        }
        for (const server of tunnelServers.values()) {
          server.cleanup();
        }
      }),
    );

    const httpServer = Bun.serve({
      // hostname: host, // Let Bun default to all interfaces
      port,
      fetch: (req, _server) => {
        const hostname = req.headers.get("host") || "";
        const url = new URL(req.url, `http://${hostname}`);
        const subdomainMatch = hostname.match(/^([a-z0-9]+)[.]([^:]+)(?::(\d+))?$/);
        const clientIdFromHost = subdomainMatch ? subdomainMatch[1] : null;
        const pathClientId = parsePathSubdomain(req.url);

        if (req.url === "/" || req.url.startsWith("/?new") || url.searchParams.has("new")) {
          const tunnelInfo = createTunnelServer(port, hostname);
          tunnelServers.set(tunnelInfo.clientId, tunnelInfo);

          const _connTimeout = setTimeout(() => {
            if (tunnelServers.has(tunnelInfo.clientId)) {
              tunnelServers.delete(tunnelInfo.clientId);
              tunnelInfo.cleanup();
            }
          }, 5000);

          return new Response(`url=${tunnelInfo.url}\n`, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }

        const targetClientId = clientIdFromHost || pathClientId;
        if (targetClientId && clients.has(targetClientId)) {
          const client = clients.get(targetClientId)!;

          if (client.activeRequest) {
            waitLists.get(targetClientId)!.push({ clientId: targetClientId });
            return new Response("Too Many Requests", { status: 429 });
          }

          client.activeRequest = true;

          const cleanup = () => {
            client.activeRequest = false;
            const next = waitLists.get(targetClientId)?.shift();
            if (next) {
              cleanup();
            }
          };

          client.socket.once("end", cleanup);
          client.socket.once("error", cleanup);
          client.socket.once("close", cleanup);

          return new Response(req.body, {
            status: 200,
          });
        }

        if (clientIdFromHost) {
          const tunnelInfo = createTunnelServer(port, hostname, clientIdFromHost);
          tunnelServers.set(tunnelInfo.clientId, tunnelInfo);

          return new Response(`url=${tunnelInfo.url}\n`, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }

        return new Response("Not Found", { status: 404 });
      },
      error: (err: Error) => {
        console.error("Server error:", err);
        return new Response("Internal Server Error", { status: 500 });
      },
    });

    yield* Effect.async<void, ServerError>((resume) => {
      if (httpServer) {
        resume(Effect.succeed(undefined));
      }
    });

    const tcpServer = net.createServer();

    yield* Effect.addFinalizer(() => Effect.sync(() => tcpServer.close()));

    yield* Effect.async<void, ServerError>((resume) => {
      tcpServer.listen(0, host, () => {
        resume(Effect.succeed(undefined));
      });
      tcpServer.on("error", (err: Error) => {
        resume(Effect.fail(new ServerError(err.message)));
      });
    });

    while (true) {
      const socket = yield* Effect.async<net.Socket, ServerError>((resume) => {
        tcpServer.once("connection", (s) => resume(Effect.succeed(s)));
        tcpServer.once("error", (err: Error) => resume(Effect.fail(new ServerError(err.message))));
      });

      yield* handleClientConnection(socket, clients, waitLists);
    }
  });

export const createServer = (
  port: number,
  host = "0.0.0.0",
): Effect.Effect<void, ServerErrors, Scope.Scope> =>
  Effect.gen(function* () {
    yield* createHttpServer(port, host);
  });

export const startServer = (port: number, host?: string): Promise<void> =>
  Effect.runPromise(Effect.scoped(createServer(port, host)));
