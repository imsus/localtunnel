# Contributing to localtunnel

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Bun 1.0.0+
- Git

### Setup

```bash
# Fork the repository on GitHub

# Clone your fork
git clone https://github.com/YOUR_USERNAME/localtunnel.git
cd localtunnel

# Add upstream remote
git remote add upstream https://github.com/imsus/localtunnel.git

# Install dependencies
bun install
```

### Development Workflow

1. **Create a branch**
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b feature/my-feature
   ```

2. **Make changes**
   - Follow coding style (see below)
   - Add tests for new functionality
   - Update documentation as needed

3. **Verify changes**
   ```bash
   # Run linting
   bun run lint

   # Run type checking
   bun run typecheck

   # Run tests
   bun test

   # Format code
   bun run fmt
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add my feature"
   git push origin feature/my-feature
   ```

5. **Create Pull Request**
   - Fill out the PR template completely
   - Link any related issues
   - Ensure all CI checks pass

## Coding Style

### TypeScript

- Use TypeScript for all new code
- Enable `strict` mode in tsconfig
- Prefer explicit types over `any`
- Use `Effect.ts` for error handling and async operations

### Code Style Tools

We use `oxlint` and `oxfmt` for linting and formatting:

```bash
# Check for issues
bun run lint

# Auto-format code
bun run fmt

# Both at once
bun run check
```

### Git Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring (no functional changes)
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example:
```
feat(client): add retry logic for tunnel connection

Implement exponential backoff for failed tunnel connections
with configurable max retries and timeout.

Closes #123
```

## Testing

### Running Tests

```bash
# Run all tests
bun test

# Run with coverage
bun run test:coverage

# Run e2e tests
bun run test:e2e
```

### Writing Tests

- Write tests for all new functionality
- Follow existing test patterns in `packages/*/test/`
- Use `bun:test` framework
- Aim for meaningful coverage, not just line count

## Project Structure

```
localtunnel/
├── packages/
│   ├── client/      # Tunnel client implementation
│   │   ├── bin/     # CLI entry points
│   │   ├── src/     # Source code
│   │   └── test/    # Tests
│   ├── server/      # Tunnel server implementation
│   │   ├── bin/
│   │   ├── src/
│   │   └── test/
│   └── shared/      # Shared utilities
│       └── src/
├── .github/
│   ├── workflows/   # CI/CD pipelines
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
└── scripts/         # Build and utility scripts
```

## Packages

### @localtunnel/client

Client-side tunnel implementation. Changes here affect how tunnels connect to servers.

### @localtunnel/server

Server-side tunnel implementation. Changes here affect tunnel server behavior.

### @localtunnel/shared

Shared utilities used by both client and server. Keep this minimal to reduce coupling.

## Adding Dependencies

We use Bun workspace catalogs for dependency management. Edit `package.json`:

```json
{
  "workspaces": {
    "catalog": {
      "effect": "^3.0.0"
    },
    "catalogs": {
      "dev": {
        "pino-pretty": "^10.0.0"
      }
    }
  }
}
```

- `catalog`: Dependencies available to all packages
- `catalogs/dev`: Development-only dependencies

## Building Binaries

```bash
# Build all packages
bun run compile

# Build individual packages
bun run compile --filter localtunnel-client
bun run compile --filter localtunnel-server
```

## Questions?

- Check existing [issues](https://github.com/imsus/localtunnel/issues)
- Join our [Discord](https://discord.gg/localtunnel)
- Open a new issue for bugs or feature requests
