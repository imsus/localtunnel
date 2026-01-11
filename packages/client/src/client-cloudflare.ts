/**
 * Client for Cloudflare Workers tunnel server
 * Uses HTTP polling instead of TCP
 */

import { Effect } from "effect";

export interface TunnelConfig {
  host: string;      // e.g., "your-worker.pages.dev"
  localPort: number;
  localHost?: string;
  localHttps?: boolean;
}

export interface RequestInfo {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: string;
}

export interface ResponseInfo {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface CloudflareTunnel {
  url: string;
  close: () => Promise<void>;
  onRequest?: (listener: (info: RequestInfo) => void) => void;
}

export const openTunnel = (
  port: number,
  opts?: Partial<TunnelConfig>,
): Effect.Effect<CloudflareTunnel, Error> =>
  Effect.gen(function* () {
    const config: TunnelConfig = {
      host: opts?.host || "localhost:8787",
      localPort: port,
      localHost: opts?.localHost || "localhost",
      localHttps: opts?.localHttps || false,
    };

    // Create tunnel via API
    const createResponse = yield* Effect.tryPromise({
      try: () =>
        fetch(`https://${config.host}/api/tunnel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            port: config.localPort,
            host: config.localHost,
            https: config.localHttps,
          }),
        }),
      catch: (err) => new Error(`Failed to create tunnel: ${err}`),
    });

    if (!createResponse.ok) {
      return yield* Effect.fail(new Error(`Failed to create tunnel: ${createResponse.statusText}`));
    }

    const { id, url } = yield* Effect.tryPromise({
      try: () => createResponse.json() as Promise<{ id: string; url: string }>,
      catch: (err) => new Error(`Failed to parse tunnel response: ${err}`),
    });

    // Poll for requests
    const pollInterval = 500;
    const timeout = 30000;
    let closed = false;

    const poll = async (): Promise<void> => {
      while (!closed) {
        try {
          const pollResponse = await fetch(`https://${config.host}/api/tunnel/${id}`);
          if (pollResponse.ok) {
            const { requests } = await pollResponse.json() as { requests: RequestInfo[] };
            for (const req of requests) {
              // Forward to local server
              const localResponse = await fetch(
                `${config.localHttps ? "https" : "http"}://${config.localHost}:${config.localPort}${req.path}`,
                {
                  method: req.method,
                  headers: req.headers,
                  body: req.body ? Buffer.from(req.body, "base64") : undefined,
                },
              );

              const body = await localResponse.arrayBuffer();
              const bodyBase64 = Buffer.from(body).toString("base64");

              // Send response back
              await fetch(`https://${config.host}/api/tunnel/${id}/${req.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: localResponse.status,
                  headers: Object.fromEntries(localResponse.headers.entries()),
                  body: bodyBase64,
                }),
              });
            }
          }
        } catch {
          // Ignore polling errors
        }

        await new Promise((r) => setTimeout(r, pollInterval));
      }
    };

    // Start polling in background
    poll();

    return {
      url,
      close: async () => {
        closed = true;
      },
    };
  });
