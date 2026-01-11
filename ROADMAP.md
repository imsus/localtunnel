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

## Current Status

**v3.0.0** is released. See [CHANGELOG.md](./CHANGELOG.md) for details.

---

# v3.0.0 - Core Rewrite ✅

**Released:** 2026-01-11

## Completed

- Bun monorepo structure (`packages/client`, `packages/server`, `packages/shared`)
- TypeScript configuration with shared configs
- Effect.ts integration for client and server
- Error types (`TunnelErrors`, `ConnectionError`, `TimeoutError`, `ServerError`)
- Services layer with `getClientConfig`, `getServerConfig`
- Client implementation: `openTunnel`, `openTunnelWithRetry`, `openTunnelCluster`
- Server implementation with Bun.serve
- CLI tools: `lt` and `localtunnel-server`
- Unit tests (client, server)
- oxlint/oxfmt configuration
- GitHub Actions CI (lint, test, build)
- Structured logging with pino
- Configuration file support (--config)
- Environment variable support with .env loading
- Admin server with metrics endpoint

## Architecture Decisions (Deviated from Original Plan)

| Original Plan         | Current Implementation      | Reason                    |
| --------------------- | --------------------------- | ------------------------- |
| Separate `cluster.ts` | Integrated into `client.ts` | Simpler codebase          |
| Custom TCP proxy      | Bun.serve                   | Native Bun API            |
| Complex service layer | Simple config functions     | Reduced complexity        |
| Connection pooling    | Single connection           | Sufficient for most cases |

---

# v3.1.0 - Performance & Reliability

**Goal:** Performance optimization, reliability improvements, better UX

## Planned Items

### Performance
- [ ] Connection pooling with Effect pool
- [ ] Memory optimization with proper cleanup
- [ ] Latency benchmarking

### Reliability
- [ ] Enhanced retry policies with `Effect.retryPolicy`
- [ ] Better error recovery
- [ ] Health checks

### UX
- [ ] Progress indicators
- [ ] Better error messages

### Documentation
- [ ] API documentation
- [ ] Architecture docs

---

# v3.2.0 - Features & Extensibility

**Goal:** New features, plugin system, extensibility

## Planned Items

### Features
- [ ] Custom subdomain patterns
- [ ] Rate limiting with Effect semaphore
- [ ] Authentication options
- [ ] IP allowlisting

### Extensibility
- [ ] Plugin system
- [ ] Middleware support
- [ ] Custom request handlers

### Observability
- [ ] Advanced metrics
- [ ] Tracing support
- [ ] Structured logging improvements

---

# v4.0.0 - Future (Research)

**Exploratory ideas for major version**

- WebTransport support
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
