import { describe, test, expect } from "bun:test";
import { ServerError, ProxyError, ClientError, ServerErrors } from "../src/errors";

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

  test("handles handshake timeout", () => {
    const error = new ClientError("Handshake timeout");
    expect(error._tag).toBe("ClientError");
    expect(error.message).toBe("Handshake timeout");
  });
});

describe("ServerConfig", () => {
  test("has host and port", () => {
    const config = {
      host: "0.0.0.0",
      port: 8080,
    };

    expect(config.host).toBe("0.0.0.0");
    expect(config.port).toBe(8080);
  });

  test("supports custom host", () => {
    const config = {
      host: "127.0.0.1",
      port: 3000,
    };

    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(3000);
  });
});

describe("Error message scenarios", () => {
  test("ServerError formats port binding error", () => {
    const error = new ServerError("EADDRINUSE: Port 8080 already in use");
    expect(error.message).toContain("EADDRINUSE");
  });

  test("ProxyError formats connection reset", () => {
    const error = new ProxyError("ECONNRESET: Connection was reset");
    expect(error.message).toContain("ECONNRESET");
  });

  test("ClientError formats invalid handshake", () => {
    const error = new ClientError("Invalid handshake: missing Host header");
    expect(error._tag).toBe("ClientError");
  });
});

describe("Server error scenarios", () => {
  test("ServerError handles port already in use", () => {
    const error = new ServerError("EADDRINUSE: Address already in use :::0");
    expect(error._tag).toBe("ServerError");
    expect(error.message).toContain("EADDRINUSE");
  });

  test("ServerError handles permission denied", () => {
    const error = new ServerError("EACCES: Permission denied for port 80");
    expect(error._tag).toBe("ServerError");
    expect(error.message).toContain("EACCES");
  });

  test("ProxyError handles broken pipe", () => {
    const error = new ProxyError("EPIPE: The pipe was broken");
    expect(error._tag).toBe("ProxyError");
    expect(error.message).toContain("EPIPE");
  });
});

describe("Client error scenarios", () => {
  test("ClientError handles invalid subdomain format", () => {
    const error = new ClientError("Invalid subdomain format: must be 4 chars");
    expect(error._tag).toBe("ClientError");
    expect(error.message).toContain("Invalid subdomain");
  });

  test("ClientError handles timeout during handshake", () => {
    const error = new ClientError("Handshake timeout after 5000ms");
    expect(error._tag).toBe("ClientError");
    expect(error.message).toContain("timeout");
  });

  test("ClientError handles malformed request", () => {
    const error = new ClientError("Malformed HTTP request: missing protocol");
    expect(error._tag).toBe("ClientError");
    expect(error.message).toContain("Malformed");
  });
});
