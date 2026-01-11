import { Effect, Scope, Stream } from "effect";
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
  Effect.gen(function* () {
    const handshake = yield* Effect.async<string, ClientError>((resume) => {
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

    return handshake;
  });

const handleConnection = (socket: net.Socket): Effect.Effect<void, never, Scope> =>
  Effect.gen(function* () {
    const clientId = yield* parseClientId(socket).pipe(Effect.orElseSucceed(() => generateId()));

    clients.set(clientId, socket);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        clients.delete(clientId);
        socket.destroy();
      }),
    );

    const dataStream = Stream.fromReadable(socket, {
      onError: (err) => new ProxyError(err.message),
    });

    yield* Stream.run(
      dataStream.pipe(
        Stream.flatMap((chunk) =>
          Stream.fromEffect(
            Effect.forEach(
              Array.from(clients.entries()),
              ([id, clientSocket]) => {
                if (id !== clientId && !clientSocket.destroyed) {
                  return Effect.sync(() => clientSocket.write(chunk));
                }
                return Effect.unit;
              },
              { concurrency: "unbounded" },
            ),
          ),
        ),
      ),
    );
  });

const acceptConnections = (server: net.Server): Stream.Stream<net.Socket, ServerError> =>
  Stream.async<net.Socket, ServerError>((emit) => {
    server.on("connection", (socket) => {
      emit(Effect.succeed(socket));
    });

    server.on("error", (err) => {
      emit(Effect.fail(new ServerError(err.message)));
    });
  });

export const createServer = (
  port: number,
  host = "0.0.0.0",
): Effect.Effect<void, ServerErrors, Scope> =>
  Effect.gen(function* () {
    const server = net.createServer();

    yield* Effect.addFinalizer(() => Effect.sync(() => server.close()));

    yield* Effect.async<void, ServerError>((resume) => {
      server.listen(port, host, () => {
        resume(Effect.unit);
      });

      server.on("error", (err) => {
        resume(Effect.fail(new ServerError(err.message)));
      });
    });

    const connections = yield* acceptConnections(server);

    yield* Stream.run(
      connections.pipe(
        Stream.flatMap((socket) =>
          Stream.fromEffect(handleConnection(socket), { concurrency: "unbounded" }),
        ),
      ),
    );
  });

export const startServer = (port: number, host?: string): Promise<void> =>
  Effect.runPromise(createServer(port, host));
