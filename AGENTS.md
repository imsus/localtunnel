# AGENTS.md - Localtunnel Development Guide

## Project Overview

Localtunnel is a Bun-based TypeScript monorepo with three packages:
- `packages/client` - Client for creating tunnels to local servers
- `packages/server` - Server that manages tunnel connections
- `packages/shared` - Shared utilities and types

Uses the [Effect](https://effect.website) library for functional error handling and concurrency.

## Build, Lint, and Test Commands

```bash
# Run all tests
bun test

# Run a single test file
bun test test/e2e.test.ts
bun test packages/client/test/client.test.ts
bun test packages/server/test/server.test.ts

# Run tests with coverage
bun test --coverage

# Lint codebase
oxlint .

# Format codebase (writes changes)
oxfmt --write .

# Check formatting without writing
oxfmt --check .

# Full validation (lint + format check + tests)
oxlint . && oxfmt --check . && bun test

# TypeScript type checking
npx tsc --noEmit

# Compile all packages
bun run --filter '*' compile

# Link CLI tools (after compile)
bun run link

# Install CLI shortcuts
npm run install:cli
```

## Code Style Guidelines

### TypeScript
- Use explicit TypeScript types for function parameters and return values
- Use interfaces for configuration objects (e.g., `TunnelConfig`, `ServerConfig`)
- Use type exports: `export type { ServerErrors } from "./errors";`

### Effect Library
- Use `Effect.gen(function* () { ... })` for async operations
- Use `yield*` to extract values from Effects
- Return Effect types explicitly: `Effect.Effect<A, E, R>`
- Use `Effect.tryPromise` for promise-to-Effect conversion
- Use `Effect.async` for callback-based APIs
- Use `Effect.addFinalizer` for cleanup logic
- Use `Schedule` for retry policies (e.g., `Schedule.exponential`)

### Error Handling
- Use tagged error classes with `_tag` property for discriminated unions
- Define error types as unions: `type TunnelErrors = ConnectionError | TimeoutError | TunnelError`
- Example error class pattern:
  ```typescript
  export class ConnectionError {
    readonly _tag = "ConnectionError";
    constructor(
      readonly host: string,
      readonly port: number,
      readonly reason: string,
    ) {}
  }
  ```

### Imports
- Use named imports from Effect: `import { Effect, Schedule, PubSub } from "effect";`
- Use `* as` for Node.js modules: `import * as net from "net";`
- Group imports: Effect first, then Node.js, then local modules
- Re-export types: `export * from "./env";`

### Formatting (oxfmt)
- Line width: 100 characters
- Indent: 2 spaces
- Quote style: double quotes
- No trailing commas

### Naming Conventions
- Interfaces: PascalCase (e.g., `TunnelConfig`, `ClientConnection`)
- Functions: camelCase (e.g., `openTunnel`, `parseClientHandshake`)
- Constants: UPPER_SNAKE_CASE for compile-time constants (e.g., `CHARS`)
- Private/internal variables: camelCase with underscore prefix if needed
- Error classes: PascalCase with "Error" suffix

### File Organization
- One main export file per package (`src/index.ts`)
- Errors in dedicated files (`src/errors.ts`)
- Services in `src/service.ts`
- Main logic in `src/{client,server}.ts`
- Tests alongside source in `test/` directory
- Use `.js` extension in test imports: `import { ... } from "../src/errors.js";`

### General Patterns
- Use nullish coalescing for defaults: `host ?? "localhost"`
- Use optional chaining: `info.remote_ip || info.remote_host`
- Use truthy checks for undefined: `config.allowInvalidCert ?? false`
- Avoid `any` type; use explicit types or `unknown` with type guards
- Keep functions small and focused
- Use `Effect.scoped` for resource management

### Testing
- Use `bun:test` with `describe`, `test`, `expect`
- Use `beforeAll`/`afterAll` for setup/teardown
- Name test suites with `describe("Feature", ...)`
- Use descriptive test names: `test("Server returns tunnel URL on request", ...)`

### Code to Avoid
- `console.log` in production code (allowed with `noConsole: "warn"` in oxlint)
- `debugger` statements (error in oxlint)
- Comments unless explaining complex logic
- Default exports (use named exports)
