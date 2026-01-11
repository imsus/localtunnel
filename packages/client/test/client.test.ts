import { describe, test, expect } from "bun:test";
import { Effect } from "effect";
import { ConnectionError, TimeoutError, TunnelError, TunnelErrors } from "../src/errors.js";
import { TunnelConfig } from "../src/service.js";

describe("TunnelErrors", () => {
  test("ConnectionError has correct tag", () => {
    const error = new ConnectionError("localhost", 8080, "ECONNREFUSED");
    expect(error._tag).toBe("ConnectionError");
    expect(error.host).toBe("localhost");
    expect(error.port).toBe(8080);
    expect(error.reason).toBe("ECONNREFUSED");
  });

  test("TimeoutError has correct tag", () => {
    const error = new TimeoutError(5000);
    expect(error._tag).toBe("TimeoutError");
    expect(error.duration).toBe(5000);
  });

  test("TunnelError has correct tag", () => {
    const error = new TunnelError("Tunnel creation failed");
    expect(error._tag).toBe("TunnelError");
    expect(error.message).toBe("Tunnel creation failed");
  });

  test("ConnectionError is discriminated correctly", () => {
    const error: TunnelErrors = new ConnectionError("example.com", 443, "Timeout");
    expect(error._tag).toBe("ConnectionError");
  });

  test("TimeoutError is discriminated correctly", () => {
    const error: TunnelErrors = new TimeoutError(30000);
    expect(error._tag).toBe("TimeoutError");
  });

  test("TunnelError is discriminated correctly", () => {
    const error: TunnelErrors = new TunnelError("Connection closed");
    expect(error._tag).toBe("TunnelError");
  });
});

describe("TunnelConfig", () => {
  test("default config values", () => {
    const config: TunnelConfig = {
      host: "localtunnel.me",
      localPort: 3000,
    };

    expect(config.host).toBe("localtunnel.me");
    expect(config.localPort).toBe(3000);
    expect(config.subdomain).toBeUndefined();
    expect(config.localHost).toBeUndefined();
    expect(config.localHttps).toBeUndefined();
  });

  test("custom config values", () => {
    const config: TunnelConfig = {
      host: "custom.localtunnel.me",
      localPort: 8080,
      subdomain: "myapp",
      localHost: "localhost",
      localHttps: true,
      localCert: "/path/to/cert",
      localKey: "/path/to/key",
      localCa: "/path/to/ca",
      allowInvalidCert: true,
    };

    expect(config.host).toBe("custom.localtunnel.me");
    expect(config.localPort).toBe(8080);
    expect(config.subdomain).toBe("myapp");
    expect(config.localHost).toBe("localhost");
    expect(config.localHttps).toBe(true);
    expect(config.localCert).toBe("/path/to/cert");
    expect(config.localKey).toBe("/path/to/key");
    expect(config.localCa).toBe("/path/to/ca");
    expect(config.allowInvalidCert).toBe(true);
  });

  test("config with partial options", () => {
    const config: TunnelConfig = {
      host: "localtunnel.me",
      localPort: 3000,
      subdomain: "test",
    };

    expect(config.host).toBe("localtunnel.me");
    expect(config.localPort).toBe(3000);
    expect(config.subdomain).toBe("test");
  });
});

describe("ConnectionError scenarios", () => {
  test("handles connection refused", () => {
    const error = new ConnectionError("127.0.0.1", 99999, "ECONNREFUSED");
    expect(error._tag).toBe("ConnectionError");
    expect(error.reason).toBe("ECONNREFUSED");
  });

  test("handles timeout errors", () => {
    const error = new ConnectionError("10.0.0.1", 80, "ETIMEDOUT");
    expect(error._tag).toBe("ConnectionError");
    expect(error.reason).toBe("ETIMEDOUT");
  });

  test("handles host unreachable", () => {
    const error = new ConnectionError("192.168.1.1", 80, "EHOSTUNREACH");
    expect(error._tag).toBe("ConnectionError");
    expect(error.reason).toBe("EHOSTUNREACH");
  });
});

describe("TimeoutError scenarios", () => {
  test("default timeout duration", () => {
    const error = new TimeoutError(30000);
    expect(error.duration).toBe(30000);
  });

  test("custom timeout duration", () => {
    const error = new TimeoutError(60000);
    expect(error.duration).toBe(60000);
  });
});

describe("TunnelConfig defaults", () => {
  test("undefined options result in default values", () => {
    const config: TunnelConfig = {
      host: "localtunnel.me",
      localPort: 3000,
    };

    expect(config.allowInvalidCert).toBeUndefined();
    expect(config.localCert).toBeUndefined();
    expect(config.localKey).toBeUndefined();
    expect(config.localCa).toBeUndefined();
  });
});
