# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Localtunnel is a Bun-based TypeScript monorepo that implements a reverse proxy tunnel service. It consists of three packages:

- **@localtunnel/client** - Connects to tunnel servers and forwards local traffic
- **@localtunnel/server** - Accepts tunnel connections and proxies HTTP requests to clients
- **@localtunnel/shared** - Shared configuration and utilities

The project uses [Effect.ts](https://effect.website) for functional error handling, async operations, and resource management.

## Build, Test, and Lint Commands

```bash
# Run all tests
bun test

# Run specific test file
bun test test/e2e.test.ts
bun test packages/client/test/client.test.ts

# Run tests with coverage
bun test --coverage

# Lint codebase
bun run lint

# Format code (writes changes)
bun run fmt

# Full validation: lint + format check + tests
bun run check

# TypeScript type checking
bun run typecheck

# Compile all packages
bun run compile

# Link CLI tools (after compile)
bun run link

# Unlink CLI tools
bun run unlink
```

## Architecture

### Package Structure

Each package follows this pattern:
- `src/index.ts` - Main exports (use named exports, no default exports)
- `src/errors.ts` - Tagged error classes with `_tag` property
- `src/service.ts` - Service layer using Effect.ts
- `src/{client,server}.ts` - Main business logic
- `bin/` - CLI entry points

### Effect.ts Patterns

```typescript
// Use Effect.gen for async operations
Effect.gen(function* () {
  const result = yield* someEffect;
  return result;
});

// Tagged errors for discriminated unions
export class ConnectionError {
  readonly _tag = "ConnectionError";
  constructor(readonly host: string, readonly port: number) {}
}

// Return Effect types explicitly
Effect.Effect<A, E, R>
```

### Configuration

Dependencies are managed via Bun workspace catalogs in root `package.json`:
- `catalog` - Production dependencies (available to all packages)
- `catalogs/dev` - Development-only dependencies

## Key Conventions

- Line width: 100 characters, indent: 2 spaces (oxfmt config)
- Use explicit TypeScript types; avoid `any`
- Imports order: Effect → Node.js modules → local modules
- Use `* as` for Node.js module imports
- Tests alongside source in `test/` directory
- Use `.js` extension in test imports from source
