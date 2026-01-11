# Typecheck Refactor Plan

## Error Summary (23 errors)

| Category                   | Count | Files                                                 |
| -------------------------- | ----- | ----------------------------------------------------- |
| Service Interface Mismatch | 6     | `client/mock.ts`, `server/mock.ts`                    |
| Tunnel Interface           | 5     | `client/client.ts`                                    |
| Effect Retry API           | 2     | `client/client.ts`                                    |
| Socket Stream Types        | 4     | `client/client.ts`, `client/HeaderHostTransformer.ts` |
| Scope Requirements         | 2     | `client/client.ts`, `server/server.ts`                |
| Implicit `any` Parameters  | 3     | `client/client.ts`                                    |
| Unknown Error Types        | 2     | `client/client.ts`                                    |
| Integration Test           | 2     | `client/test`, `server/test`                          |

---

## Phase 1: Fix Service Interfaces

**Files:** `packages/client/src/service.ts`, `packages/server/src/service.ts`

```
1. Export error types from services:
   - Export ConnectionError, TunnelError from client/service.ts
   - Export ServerError from server/service.ts

2. Update TunnelService interface:
   - openTunnel returns Effect<string, ConnectionError | TunnelError, never>
   - closeTunnel returns Effect<void, never, never>

3. Update ServerService interface:
   - createServer returns Effect<void, ServerError, never>
   - startServer returns Effect<void, ServerError, never>
```

### Phase 2: Fix Mock Services

**Files:** `packages/client/src/mock.ts`, `packages/server/src/mock.ts`

```
1. Fix Failure Mocks:
   - Use Effect.catch to convert typed errors to never:
     openTunnel: (_config) => Effect.fail(new ConnectionError(...))
       .pipe(Effect.catchAll(() => Effect.succeed("")))
```

### Phase 3: Fix Tunnel Interface & Implementation

**File:** `packages/client/src/client.ts`

```
1. Update Tunnel interface:
   - close returns Promise<void> (not Promise<Socket[]>)
   - Ensure onRequest is optional or provide default

2. Fix openTunnel return:
   - Add onRequest callback to return value
   - Fix close to return Promise<void>

3. Fix openTunnelCluster return:
   - Fix close signature: Promise<void>
   - Add proper cleanup logic
```

### Phase 4: Fix Effect Retry

**File:** `packages/client/src/client.ts`

```
Current: Effect.retry({ times: 3, delay: 1000 })
Fix: Use Schedule
     const policy = Schedule.exponential(1000).pipe(Schedule.upTo(3))
     Effect.retry(policy)
```

### Phase 5: Fix Stream/pipe Types

**Files:** `packages/client/src/client.ts`, `packages/client/src/HeaderHostTransformer.ts`

```
1. Remove pipe() usage on Socket (Node.js streams don't have .pipe() method)
2. Use Bun's pipe() global function or Node stream.pipe()
3. Fix HeaderHostTransformer TransformStream types
```

### Phase 6: Fix Implicit any & unknown

**File:** `packages/client/src/client.ts`

```
1. Add explicit types to error handlers:
   socket.on("error", (err: Error) => ...)

2. Catch blocks need proper types:
   .pipe(Effect.catchAll((err: unknown) => ...))
```

### Phase 7: Fix Scope Requirements

**Files:** `packages/client/src/client.ts`, `packages/server/src/server.ts`

```
1. Ensure Scope is provided in tests:
   Effect.provide(program, Layer.merge(config, service))

2. Or use Effect.runPromise which provides default scope
```

### Phase 8: Fix Integration Tests

**Files:** `packages/client/test/integration.test.ts`, `packages/server/test/integration.test.ts`

```
1. Fix Context.GenericTag usage:
   - Tag must be imported correctly
   - Use proper typing for Tag<T>
```

---

## Files to Modify

```
packages/client/src/client.ts
packages/client/src/service.ts
packages/client/src/mock.ts
packages/client/src/HeaderHostTransformer.ts
packages/client/bin/lt.ts
packages/client/test/integration.test.ts

packages/server/src/server.ts
packages/server/src/service.ts
packages/server/src/mock.ts
packages/server/test/integration.test.ts

Root tsconfig.json (remove composite references)
packages/client/tsconfig.json
packages/server/tsconfig.json
```

---

## Testing Strategy

After each phase:

```bash
bun run typecheck 2>&1 | grep "error TS" | wc -l
# Goal: Reduce from 23 to 0
```

Final verification:

```bash
bun run lint && bun test && bun run typecheck
```

---

## Current Typecheck Output

```
packages/client/bin/lt.ts(100,47): error TS2339: Property 'url' does not exist on type 'Effect<Tunnel, TunnelErrors, never>'.
packages/client/bin/lt.ts(102,8): error TS2339: Property 'close' does not exist on type 'Effect<Tunnel, TunnelErrors, never>'.
packages/client/bin/lt.ts(107,16): error TS2339: Property 'close' does not exist on type 'Effect<Tunnel, TunnelErrors, never>'.
packages/client/bin/lt.ts(112,16): error TS2339: Property 'close' does not exist on type 'Effect<Tunnel, TunnelErrors, never>'.
packages/client/src/client.ts(46,27): error TS7006: Parameter 'err' implicitly has an 'any' type.
packages/client/src/client.ts(145,27): error TS7006: Parameter 'err' implicitly has an 'any' type.
packages/client/src/client.ts(161,3): error TS2322: Type 'Effect<{ url: string; close: () => Promise<[Socket, Socket]>; }, TunnelErrors, never>' is not assignable to type 'Effect<Tunnel, TunnelErrors, never>'.
packages/client/src/client.ts(201,38): error TS2769: No overload matches this call.
packages/client/src/client.ts(218,61): error TS18046: 'err' is of type 'unknown'.
packages/client/src/client.ts(240,39): error TS18046: 'err' is of type 'unknown'.
packages/client/src/client.ts(294,15): error TS2339: Property 'code' does not exist on type 'Error'.
packages/client/src/client.ts(310,50): error TS2345: Argument of type 'Socket' is not assignable to parameter of type 'ReadableStream<Uint8Array<ArrayBufferLike>>'.
packages/client/src/client.ts(313,12): error TS2339: Property 'pipe' does not exist on type 'Socket | WritableStream'.
packages/client/src/client.ts(335,3): error TS2322: Type 'Effect<{ url: string; close: () => Promise<Socket[]>; onRequest: ... }, TunnelErrors, never>' is not assignable to type 'Effect<Tunnel, TunnelErrors, never>'.
packages/client/src/client.ts(356,11): error TS2345: Argument of type 'Effect<void, never, Scope>' is not assignable to parameter of type 'Effect<void, never, never>'.
packages/client/src/client.ts(358,50): error TS2345: Argument of type 'Dequeue<RequestInfo>' is not assignable to parameter of type '{ method: string; path: string; }'.
packages/client/src/HeaderHostTransformer.ts(18,5): error TS2322: Type 'ReadableStream<ArrayBufferView<ArrayBufferLike> | undefined>' is not assignable to type 'ReadableStream<Uint8Array<ArrayBufferLike>>'.
packages/client/src/HeaderHostTransformer.ts(18,31): error TS2345: Argument of type 'TransformStream<Uint8Array<ArrayBufferLike>, Uint8Array<ArrayBufferLike>>' is not assignable to parameter of type 'ReadableWritablePair<...>'.
packages/client/src/mock.ts(20,3): error TS2322: Type '(_config: TunnelConfig) => Effect.Effect<never, ConnectionError, never>' is not assignable to type '(config: TunnelConfig) => Effect<string, never, never>'.
packages/client/src/mock.ts(27,3): error TS2322: Type '(_config: TunnelConfig) => Effect.Effect<never, TunnelError, never>' is not assignable to type '(config: TunnelConfig) => Effect<string, never, never>'.
packages/client/test/integration.test.ts(48,33): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Tag<unknown, unknown>'.
packages/server/src/server.ts(286,21): error TS2345: Argument of type 'Effect<void, ServerErrors, Scope>' is not assignable to parameter of type 'Effect<void, ServerErrors, never>'.
packages/server/test/integration.test.ts(48,33): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Tag<unknown, unknown>'.
```

---

## Commands to Run

```bash
# Check current error count
bun run typecheck 2>&1 | grep "error TS" | wc -l

# Run full check
bun run lint && bun test && bun run typecheck

# Run tests
bun test

# Run lint
bun run lint
```
