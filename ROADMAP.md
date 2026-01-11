# localtunnel Roadmap

## Overview

Major rewrite to modernize the codebase, improve maintainability, and prepare for future growth.

## Technology Stack

| Category        | Tool           |
| --------------- | -------------- |
| Runtime         | Bun            |
| Package Manager | Bun            |
| Test Runner     | `bun test`     |
| Bundler         | `bun bundle`   |
| Linter          | oxlint         |
| Formatter       | oxfmt          |
| FRP/Effects     | Effect.ts      |
| CI/CD           | GitHub Actions |
| Language        | TypeScript     |
| Monorepo        | Bun Workspaces |

## Goals

- Simplify codebase architecture
- Use native Bun APIs where possible
- Modern, maintained dependencies only
- Bun-native tooling (test, bundle, workspaces)
- Effect.ts for resource management, error handling, and concurrency
- Comprehensive test coverage with bun test
- Monorepo structure (client/server split)
- Ox (oxlint/oxfmt) for linting/formatting
- Robust GitHub Actions CI/CD

---

## Release Planning

| Release | Focus                             | Timeline  |
| ------- | --------------------------------- | --------- |
| v3.0.0  | Core rewrite, monorepo, Effect.ts | 2-3 weeks |
| v3.1.0  | Performance, reliability, UX      | 2-3 weeks |
| v3.2.0  | Features, extensibility           | Ongoing   |

---

# v3.0.0 - Core Rewrite

**Goal:** Modern foundation with TypeScript, Bun monorepo, Effect.ts, and comprehensive tests

## 1. Bun Setup

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify
bun --version
```

### Root package.json

```json
{
  "name": "localtunnel",
  "version": "3.0.0",
  "type": "module",
  "workspaces": ["packages/*"],
  "scripts": {
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "lint": "oxlint .",
    "fmt": "oxfmt --write .",
    "check": "oxlint . && oxfmt --check . && bun test",
    "build": "bun bundle"
  },
  "devDependencies": {
    "effect": "latest",
    "oxlint": "latest",
    "oxfmt": "latest"
  }
}
```

### bunfig.toml (root)

```toml
[test]
coverage = true
coverageThreshold = 0.9

[install]
lockfile = true
```

## 2. Bun Monorepo Structure

```
localtunnel/
├── package.json              # Root workspace config
├── bun.lockb                 # Bun lockfile
├── bunfig.toml               # Bun configuration
├── README.md
├── LICENSE
├── .github/
│   └── workflows/           # CI/CD pipelines
├── oxlintrc.json            # Linting config
├── oxfmtrc.json             # Formatting config
│
├── packages/
│   ├── client/              # Tunnel client
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts     # Main exports
│   │   │   ├── client.ts    # Effect-based client
│   │   │   ├── cluster.ts   # Connection pooling
│   │   │   ├── service.ts   # Tunnel services
│   │   │   └── types.ts     # TypeScript types
│   │   ├── bin/lt.ts        # CLI entrypoint
│   │   └── test/            # bun tests
│   │
│   └── server/              # Tunnel server
│       ├── package.json
│       ├── src/
│       │   ├── index.ts     # Main exports
│       │   ├── server.ts    # Effect-based server
│       │   ├── proxy.ts     # TCP proxy logic
│       │   ├── service.ts   # Server services
│       │   └── types.ts     # TypeScript types
│       ├── bin/server.ts    # Server entrypoint
│       └── test/            # bun tests
│
└── tsconfig.json            # Shared TypeScript config
```

### Client package.json

```json
{
  "name": "localtunnel-client",
  "version": "3.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "lt": "./bin/lt.ts"
  },
  "scripts": {
    "build": "bun bundle --outdir dist --format esm",
    "test": "bun test"
  },
  "dependencies": {
    "effect": "^3.0.0"
  }
}
```

### Server package.json

```json
{
  "name": "localtunnel-server",
  "version": "3.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "localtunnel-server": "./bin/server.ts"
  },
  "scripts": {
    "build": "bun bundle --outdir dist --format esm",
    "test": "bun test"
  },
  "dependencies": {
    "effect": "^3.0.0"
  }
}
```

## 3. Effect.ts Integration

Effect.ts is a functional programming library that excels at:

- **Resource Management** - Automatic cleanup via `Scope`
- **Error Handling** - Typed errors, retry policies
- **Concurrency** - Fiber-based parallelism
- **Dependency Injection** - Service layer pattern
- **Testing** - Mock services for unit tests

### Why Effect.ts?

| Problem            | Current Code        | With Effect.ts          |
| ------------------ | ------------------- | ----------------------- |
| Resource cleanup   | Manual `.close()`   | Automatic via `Scope`   |
| Error handling     | Scattered try/catch | Typed errors, pipelines |
| Connection pooling | Event-based         | Fiber-based concurrency |
| Config passing     | Prop drilling       | Service layer           |
| Testing            | Integration only    | Mock services           |

### Core Effect Concepts

```typescript
// 1. Effect - The main type
type Effect<A, E, R> = ...

// 2. Services - Dependency injection
interface TunnelConfig {
  host: string
  subdomain?: string
  localPort: number
}

// 3. Layers - Service implementations
const LiveTunnelConfig: Layer<TunnelConfig> = ...

// 4. Scopes - Resource management
Effect.withScope((scope) => ...)

// 5. Fibers - Concurrency
Effect.fork(effect)
```

### Error Types

```typescript
// packages/client/src/errors.ts
export class ConnectionError {
  readonly _tag = "ConnectionError";
  constructor(
    readonly host: string,
    readonly port: number,
    readonly reason: string,
  ) {}
}

export class TimeoutError {
  readonly _tag = "TimeoutError";
  constructor(readonly duration: number) {}
}

export class TunnelError {
  readonly _tag = "TunnelError";
  constructor(readonly message: string) {}
}

export type TunnelErrors = ConnectionError | TimeoutError | TunnelError;
```

### Services Layer

```typescript
// packages/client/src/service.ts
import { Effect, Layer, Context } from "effect";

export interface TunnelConfig {
  host: string;
  subdomain?: string;
  localPort: number;
  localHost?: string;
  allowInvalidCert?: boolean;
}

export interface TunnelService {
  openTunnel(config: TunnelConfig): Effect.Effect<{ url: string }, TunnelErrors, Scope>;
  closeTunnel(url: string): Effect.Effect<void, never, Scope>;
}

export const TunnelConfig = Context.GenericTag<TunnelConfig>("TunnelConfig");
export const TunnelService = Context.GenericTag<TunnelService>("TunnelService");
```

### Client Implementation with Effect

```typescript
// packages/client/src/client.ts
import { Effect, Scope, Layer, Context } from 'effect'
import * as net from 'net'

export interface Tunnel {
  url: string
  readonly close: Effect.Effect<void, never, Scope>
}

export const openTunnel = (port: number, opts?: Options): Effect.Effect<Tunnel, TunnelErrors, Scope> =>
  Effect.withScope((scope) =>
    Effect.gen(function* {
      const config = yield* getConfig(opts)

      // Connect to tunnel server
      const socket = yield* connect(config.host, scope)

      // Request tunnel
      const response = yield* requestTunnel(socket, config)

      // Establish local connection
      const localSocket = yield* connectLocal(config.localPort, scope)

      // Pipe data between sockets
      yield* Effect.fork(scope, pipeData(socket, localSocket))
      yield* Effect.fork(scope, pipeData(localSocket, socket))

      return {
        url: response.url,
        close: Effect.sync(() => {
          socket.end()
          localSocket.end()
        })
      }
    })
  )

// Retry logic with Effect
export const openTunnelWithRetry = (port: number, opts?: Options) =>
  openTunnel(port, opts).pipe(
    Effect.retry({ times: 3, delay: 1000 })
  )
```

### Server Implementation with Effect

```typescript
// packages/server/src/server.ts
import { Effect, Scope, Stream } from 'effect'
import * as net from 'net'

export const createServer = (port: number): Effect.Effect<void, never, Scope> =>
  Effect.withScope((scope) =>
    Effect.gen(function* {
      const server = net.createServer()

      yield* Effect.addFinalizer(() => Effect.sync(() => server.close()))
      yield* Effect.attachFinalizer(scope, Effect.sync(() => server.close()))

      yield* Effect.async<void>((resume) => {
        server.listen(port, () => resume(Effect.unit))
      })

      // Accept connections with fiber-based concurrency
      const connections = yield* acceptConnections(server)

      yield* Effect.forEach(connections, handleConnection, {
        concurrency: 'unbounded'
      })
    })
  )

const handleConnection = (socket: net.Socket): Effect.Effect<void, never, Scope> =>
  Effect.withScope((scope) =>
    Effect.gen(function* {
      const clientId = yield* parseClientId(socket)

      // Register client in map
      yield* registerClient(clientId, socket, scope)

      // Handle proxy data
      const dataStream = Stream.fromReadable(socket)
      yield* Stream.run(dataStream.pipe(
        Stream.map(chunk => transform(chunk)),
        Stream.toWritable(socket)
      ))
    })
  )
```

### Testing with Effect

```typescript
// packages/client/test/client.test.ts
import { test, expect, describe } from "bun:test";
import { Effect, Layer, Scope } from "effect";
import { openTunnel } from "../src/client.ts";

// Mock service for testing
const MockTunnelService = Layer.succeed(TunnelService, {
  openTunnel: () => Effect.succeed({ url: "http://test.local" }),
  closeTunnel: () => Effect.unit,
});

describe("localtunnel", () => {
  test("creates tunnel successfully", async () => {
    const tunnel = await Effect.provide(
      openTunnel(3000),
      Layer.merge(MockTunnelService, LiveScope),
    );

    expect(tunnel.url).toBeDefined();
    expect(tunnel.url.startsWith("http://")).toBe(true);
  });

  test("handles connection errors", async () => {
    const mockError = new ConnectionError("localhost", 9999, "ECONNREFUSED");

    const MockFailingService = Layer.succeed(TunnelService, {
      openTunnel: () => Effect.fail(mockError),
    });

    const result = await Effect.runPromise(Effect.provide(openTunnel(3000), MockFailingService))
      .then(() => "success")
      .catch((e) => "error");

    expect(result).toBe("error");
  });
});
```

## 4. Dependencies Strategy

### Remove (use native Bun APIs or Effect.ts)

- `axios` → native `fetch` or Effect's `HttpClient`
- `yargs` → native argument parsing
- `open` → `Bun.spawn` with Effect
- `debug` → Effect's `Logger` or native `console`

### Keep (if needed)

- None - minimize dependencies

### Add

- `effect` for FRP, resource management, error handling
- `oxlint` for linting (Bun doesn't have built-in linter)
- `oxfmt` for formatting

## 5. Tooling

### oxlint Configuration

```json
// oxlintrc.json
{
  "rules": {
    "typescript": true,
    "complexity": "warn",
    "noConsole": "warn",
    "noDebugger": "error"
  }
}
```

### oxfmt Configuration

```json
// oxfmtrc.json
{
  "lineWidth": 100,
  "indentWidth": 2,
  "quoteStyle": "double"
}
```

## 6. GitHub Actions CI

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      - run: bun install
      - run: bun run check

  test-platforms:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      - run: bun install
      - run: bun test
```

## 7. Tasks (with Effect.ts)

### Client Tasks

- [ ] Create `packages/client` directory
- [ ] Set up TypeScript config
- [ ] Define error types (`TunnelErrors`)
- [ ] Create services layer (`TunnelConfig`, `TunnelService`)
- [ ] Implement `client.ts` with Effect
- [ ] Implement retry logic with `Effect.retry`
- [ ] Implement `cluster.ts` with fiber concurrency
- [ ] Implement CLI (`bin/lt.ts`)
- [ ] Write unit tests with mock services (90% coverage)
- [ ] Write integration tests

### Server Tasks

- [ ] Create `packages/server` directory
- [ ] Set up TypeScript config
- [ ] Define server error types
- [ ] Create server services layer
- [ ] Implement `server.ts` with Effect and `Scope`
- [ ] Implement `proxy.ts` with Stream
- [ ] Implement CLI (`bin/server.ts`)
- [ ] Write unit tests with mock services (90% coverage)
- [ ] Write integration tests

---

# v3.1.0 - Performance & Reliability

**Goal:** Performance optimization, reliability improvements, better UX

## Performance

- [ ] Connection pooling optimization with Effect pool
- [ ] Memory usage reduction with proper Scope cleanup
- [ ] Latency minimization
- [ ] Benchmark suite with Effect metrics

## Reliability

- [ ] Retry logic improvements with `Effect.retryPolicy`
- [ ] Better error handling with typed errors
- [ ] Graceful degradation with `Effect.catch`
- [ ] Health checks with Effect services

## UX Improvements

- [ ] Better CLI output
- [ ] Progress indicators with Effect progress
- [ ] Verbose mode with Effect logging
- [ ] Configuration file support

## Documentation

- [ ] API documentation (Effect patterns)
- [ ] Architecture docs (services, layers, scopes)
- [ ] Contribution guide

---

# v3.2.0 - Features & Extensibility

**Goal:** New features, plugin system, extensibility

## Features

- [ ] Custom subdomain patterns
- [ ] Rate limiting with Effect semaphore
- [ ] Authentication options
- [ ] IP allowlisting

## Extensibility

- [ ] Plugin system with Effect layers
- [ ] Middleware support
- [ ] Custom request handlers

## Observability

- [ ] Metrics endpoint with Effect
- [ ] Tracing support
- [ ] Structured logging with Effect Logger

---

# v4.0.0 - Future (Research)

**Exploratory ideas for major version**

- WebTransport support with Effect Stream
- WebSocket improvements
- gRPC tunneling
- Kubernetes operator
- Cloud-native deployment

---

# Breaking Changes Summary

| Version | Changes                                                     |
| ------- | ----------------------------------------------------------- |
| v3.0.0  | Bun runtime, ES Modules only, monorepo structure, Effect.ts |
| v3.1.0  | Possible API additions (backward compatible)                |
| v3.2.0  | Possible API additions (backward compatible)                |

---

# Success Criteria (v3.0.0)

- [ ] All tests pass (90%+ coverage)
- [ ] CI/CD passes on all platforms
- [ ] No external dependencies for core functionality
- [ ] oxlint passes with no errors
- [ ] Documentation updated (Effect patterns documented)
- [ ] CLI works identically to v2.x
- [ ] Performance maintained or improved

---

# Effort Estimation

| Phase       | Tasks                            | Estimated Time |
| ----------- | -------------------------------- | -------------- |
| Setup       | Bun, Effect.ts, oxlint/oxfmt, CI | 1-2 days       |
| Client      | Effect rewrite, tests            | 3-5 days       |
| Server      | Effect rewrite, tests            | 3-5 days       |
| Integration | Full testing, release            | 2-3 days       |
| **Total**   |                                  | **2-3 weeks**  |

---

# Bun CLI Reference

| Command                  | Description                      |
| ------------------------ | -------------------------------- |
| `bun run <script>`       | Run a package.json script        |
| `bun test`               | Run tests with coverage          |
| `bun test --coverage`    | Run tests with coverage          |
| `bun bundle`             | Bundle for production            |
| `bun install`            | Install dependencies             |
| `bun add <package>`      | Add a package                    |
| `bunx <command>`         | Run a command                    |
| `bun run --filter <pkg>` | Run script in specific workspace |

# Bun Monorepo Commands

| Command                           | Description                          |
| --------------------------------- | ------------------------------------ |
| `bun install`                     | Install all workspace dependencies   |
| `bun run <script>`                | Run script in all workspaces         |
| `bun run --filter <pkg> <script>` | Run script in specific workspace     |
| `bun add <pkg> --workspace <pkg>` | Add dependency to specific workspace |

# Effect.ts Reference

| Concept             | Description                                       |
| ------------------- | ------------------------------------------------- |
| `Effect<A, E, R>`   | Main type: succeeds with A, fails with E, needs R |
| `Layer<Out, In, E>` | Service implementation                            |
| `Scope`             | Resource management context                       |
| `Context`           | Dependency injection container                    |
| `Fiber`             | Lightweight thread for concurrency                |
| `Stream<T, E, R>`   | Lazy, pull-based data stream                      |

## Effect Patterns

```typescript
// 1. Simple effect
const program = Effect.succeed(42)

// 2. With error handling
const withError = Effect.fail(new Error('failed')).pipe(
  Effect.catch('error', (e) => Effect.succeed(0))
)

// 3. Resource management
Effect.withScope((scope) =>
  Effect.gen(function* {
    const file = yield* openFile('test.txt')
    yield* Effect.addFinalizer(closeFile(file))
  })
)

// 4. Retry policy
Effect.retry({ times: 3, delay: 1000 })

// 5. Concurrency
Effect.forEach(items, (item) => process(item), { concurrency: 'unbounded' })

// 6. Service layer
const program = Effect.service(TunnelConfig).pipe(
  Effect.flatMap(config => openTunnel(config.port))
)
```
