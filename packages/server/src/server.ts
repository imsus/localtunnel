import { Effect, Scope } from "effect";
import * as net from "net";
import { ServerError, ClientError, type ServerErrors } from "./errors.js";

interface ServerConfig {
  host: string;
  port: number;
}

export { ServerConfig };

const clients = new Map<string, net.Socket>();

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

const parseClientId = (socket: net.Socket): Effect.Effect<string, ClientError> =>
  Effect.async<string, ClientError>((resume) => {
    let data = "";

    const onData = (chunk: Buffer) => {
      data += chunk.toString();
      const match = data.match(/GET \/\?(\w+)/);
      if (match) {
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
  });

const handleConnection = (socket: net.Socket): Effect.Effect<void, never, Scope.Scope> =>
  Effect.gen(function* () {
    const clientId = yield* parseClientId(socket).pipe(Effect.orElseSucceed(() => generateId()));

    clients.set(clientId, socket);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        clients.delete(clientId);
        socket.destroy();
      }),
    );

    socket.on("data", (chunk: Buffer) => {
      for (const [id, clientSocket] of clients.entries()) {
        if (id !== clientId && !clientSocket.destroyed) {
          clientSocket.write(chunk);
        }
      }
    });

    socket.on("close", () => {
      clients.delete(clientId);
    });

    socket.on("error", () => {
      clients.delete(clientId);
    });
  });

const acceptConnection = (server: net.Server): Effect.Effect<net.Socket, ServerError, never> =>
  Effect.async<net.Socket, ServerError, never>((resume) => {
    server.once("connection", (socket: net.Socket) => {
      resume(Effect.succeed(socket));
    });

    server.once("error", (err: Error) => {
      resume(Effect.fail(new ServerError(err.message)));
    });
  });

export const createServer = (
  port: number,
  host = "0.0.0.0",
): Effect.Effect<void, ServerErrors, Scope.Scope> =>
  Effect.gen(function* () {
    const server = net.createServer();

    yield* Effect.addFinalizer(() => Effect.sync(() => server.close()));

    yield* Effect.async<void, ServerError, never>((resume) => {
      server.on("listening", () => {
        server.removeListener("error", onError);
        resume(Effect.succeed(undefined));
      });

      const onError = (err: Error) => {
        server.removeListener("listening", onListen);
        server.removeListener("error", onError);
        resume(Effect.fail(new ServerError(err.message)));
      };

      const onListen = () => {
        server.removeListener("error", onError);
        resume(Effect.succeed(undefined));
      };

      server.on("error", onError);
      server.listen(port, host);
    });

    while (true) {
      const socketResult = yield* acceptConnection(server);

      if (socketResult._tag === "Left") {
        console.error("Accept error:", socketResult.left.message);
        continue;
      }

      const socket = socketResult.right;
      yield* handleConnection(socket);
    }
  });

export const startServer = (port: number, host?: string): Promise<void> =>
  Effect.runPromise(createServer(port, host));
