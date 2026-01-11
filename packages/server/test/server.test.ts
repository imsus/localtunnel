import { describe, test, expect } from "bun:test";
import { ServerError, ProxyError, ClientError, ServerErrors } from "../src/errors.js";

describe("ServerErrors", () => {
  test("ServerError has correct tag", () => {
    const error = new ServerError("Failed to start server");
    expect(error._tag).toBe("ServerError");
    expect(error.message).toBe("Failed to start server");
  });

  test("ProxyError has correct tag", () => {
    const error = new ProxyError("Connection reset by peer");
    expect(error._tag).toBe("ProxyError");
    expect(error.message).toBe("Connection reset by peer");
  });

  test("ClientError has correct tag", () => {
    const error = new ClientError("Invalid handshake");
    expect(error._tag).toBe("ClientError");
    expect(error.message).toBe("Invalid handshake");
  });

  test("ServerErrors union type works", () => {
    const serverError: ServerErrors = new ServerError("Test");
    const proxyError: ServerErrors = new ProxyError("Test");
    const clientError: ServerErrors = new ClientError("Test");

    expect(serverError._tag).toBe("ServerError");
    expect(proxyError._tag).toBe("ProxyError");
    expect(clientError._tag).toBe("ClientError");
  });
});

describe("ServerError scenarios", () => {
  test("handles address in use error", () => {
    const error = new ServerError("EADDRINUSE: Address already in use");
    expect(error._tag).toBe("ServerError");
    expect(error.message).toContain("EADDRINUSE");
  });

  test("handles permission denied error", () => {
    const error = new ServerError("EACCES: Permission denied");
    expect(error._tag).toBe("ServerError");
    expect(error.message).toContain("EACCES");
  });

  test("handles binding error", () => {
    const error = new ServerError("Cannot bind to port 80");
    expect(error._tag).toBe("ServerError");
  });
});

describe("ProxyError scenarios", () => {
  test("handles connection reset", () => {
    const error = new ProxyError("ECONNRESET: Connection reset by peer");
    expect(error._tag).toBe("ProxyError");
    expect(error.message).toContain("ECONNRESET");
  });

  test("handles broken pipe", () => {
    const error = new ProxyError("EPIPE: Broken pipe");
    expect(error._tag).toBe("ProxyError");
    expect(error.message).toContain("EPIPE");
  });
});

describe("ClientError scenarios", () => {
  test("handles malformed request", () => {
    const error = new ClientError("Malformed HTTP request");
    expect(error._tag).toBe("ClientError");
    expect(error.message).toBe("Malformed HTTP request");
  });

  test("handles protocol violation", () => {
    const error = new ClientError("Invalid protocol version");
    expect(error._tag).toBe("ClientError");
  });
});
