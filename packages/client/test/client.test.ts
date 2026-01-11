import { describe, test, expect } from "bun:test";

import { ConnectionError, TimeoutError, TunnelError, TunnelErrors } from "../src/errors";
import { TunnelConfig } from "../src/service";
import { HeaderHostTransformer } from "../src/HeaderHostTransformer";
import { TunnelInfo, RequestInfo } from "../src/client";
import { Schedule } from "effect";

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

describe("TunnelInfo", () => {
  test("has all required properties", () => {
    const info: TunnelInfo = {
      name: "abcd",
      url: "http://abcd.example.com",
      max_conn: 5,
      remote_host: "localtunnel.me",
      remote_port: 443,
      local_port: 3000,
    };

    expect(info.name).toBe("abcd");
    expect(info.url).toBe("http://abcd.example.com");
    expect(info.max_conn).toBe(5);
    expect(info.remote_host).toBe("localtunnel.me");
    expect(info.remote_port).toBe(443);
    expect(info.local_port).toBe(3000);
  });

  test("supports optional properties", () => {
    const info: TunnelInfo = {
      name: "test",
      url: "http://test.example.com",
      max_conn: 1,
      remote_host: "localtunnel.me",
      remote_ip: "1.2.3.4",
      remote_port: 443,
      local_port: 8080,
      local_host: "localhost",
      local_https: true,
      local_cert: "/path/to/cert.pem",
      local_key: "/path/to/key.pem",
      local_ca: "/path/to/ca.pem",
      allow_invalid_cert: true,
    };

    expect(info.remote_ip).toBe("1.2.3.4");
    expect(info.local_host).toBe("localhost");
    expect(info.local_https).toBe(true);
    expect(info.allow_invalid_cert).toBe(true);
  });

  test("cached_url is optional", () => {
    const info: TunnelInfo = {
      name: "test",
      url: "http://test.example.com",
      max_conn: 1,
      remote_host: "localtunnel.me",
      remote_port: 443,
      local_port: 3000,
    };

    expect(info.cached_url).toBeUndefined();
  });
});

describe("RequestInfo", () => {
  test("has method and path", () => {
    const req: RequestInfo = {
      method: "GET",
      path: "/api/users",
    };

    expect(req.method).toBe("GET");
    expect(req.path).toBe("/api/users");
  });

  test("supports POST requests", () => {
    const req: RequestInfo = {
      method: "POST",
      path: "/submit",
    };

    expect(req.method).toBe("POST");
    expect(req.path).toBe("/submit");
  });
});

describe("HeaderHostTransformer", () => {
  test("creates transformer with host", () => {
    const transformer = HeaderHostTransformer.create("myhost.local");
    expect(transformer).toBeDefined();
  });

  test("transformer has correct tag", () => {
    const transformer = HeaderHostTransformer.create("example.com");
    expect(transformer._tag).toBe("HeaderHostTransformer");
  });

  test("config stores host value", () => {
    const config = { host: "test.local" };
    const transformer = new HeaderHostTransformer(config);
    expect((transformer as any).host).toBe("test.local");
  });

  test("createTransform replaces Host header in first chunk", async () => {
    const transformer = HeaderHostTransformer.create("newhost.local");

    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode("GET / HTTP/1.1\r\nHost: oldhost.local\r\n\r\n"),
        );
        controller.close();
      },
      cancel() {},
    });

    const transformed = transformer.transform(readable);
    const reader = transformed.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (!done && result.value) {
        chunks.push(result.value);
      }
    }

    const result = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const newArr = new Uint8Array(acc.length + chunk.length);
        newArr.set(acc);
        newArr.set(chunk, acc.length);
        return newArr;
      }, new Uint8Array(0)),
    );

    expect(result).toContain("Host: newhost.local");
    expect(result).not.toContain("Host: oldhost.local");
  });

  test("createTransform passes through chunks after first replacement", async () => {
    const transformer = HeaderHostTransformer.create("target.local");

    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode("GET / HTTP/1.1\r\nHost: original.local\r\n\r\n"),
        );
        controller.enqueue(new TextEncoder().encode("Some other data"));
        controller.close();
      },
      cancel() {},
    });

    const transformed = transformer.transform(readable);
    const reader = transformed.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (!done && result.value) {
        chunks.push(result.value);
      }
    }

    const result = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const newArr = new Uint8Array(acc.length + chunk.length);
        newArr.set(acc);
        newArr.set(chunk, acc.length);
        return newArr;
      }, new Uint8Array(0)),
    );

    expect(result).toContain("Host: target.local");
    expect(result).toContain("Some other data");
  });

  test("createTransform handles Host header with different casing", async () => {
    const transformer = HeaderHostTransformer.create("test.local");

    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode("GET / HTTP/1.1\r\nhost: lowercase.local\r\n\r\n"),
        );
        controller.close();
      },
      cancel() {},
    });

    const transformed = transformer.transform(readable);
    const reader = transformed.getReader();
    const { value, done } = await reader.read();

    expect(done).toBe(false);
    const result = new TextDecoder().decode(value);
    expect(result).toContain("host: test.local");
  });
});

describe("Tunnel interface", () => {
  test("has url property", () => {
    const tunnel = {
      url: "http://abcd.localtunnel.me",
      close: async () => {},
      onRequest: () => {},
    };
    expect(tunnel.url).toBe("http://abcd.localtunnel.me");
  });

  test("close returns Promise", () => {
    const tunnel = {
      url: "http://test.localtunnel.me",
      close: async () => {},
      onRequest: () => {},
    };
    expect(typeof tunnel.close).toBe("function");
  });

  test("onRequest accepts listener callback", () => {
    const listener = (_info: RequestInfo) => {};
    const tunnel = {
      url: "http://test.localtunnel.me",
      close: async () => {},
      onRequest: listener,
    };
    expect(typeof tunnel.onRequest).toBe("function");
  });
});

describe("Client connection scenarios", () => {
  test("ConnectionError includes connection details", () => {
    const error = new ConnectionError("192.168.1.1", 443, "ECONNREFUSED");
    expect(error.host).toBe("192.168.1.1");
    expect(error.port).toBe(443);
    expect(error.reason).toBe("ECONNREFUSED");
  });

  test("TunnelError can store various messages", () => {
    const error1 = new TunnelError("Server returned 500");
    const error2 = new TunnelError("Connection closed by server");
    expect(error1.message).toBe("Server returned 500");
    expect(error2.message).toBe("Connection closed by server");
  });
});

describe("Tunnel retry configuration", () => {
  test("exponential schedule can be created", () => {
    const schedule = Schedule.exponential(1000);
    expect(schedule).toBeDefined();
  });

  test("spaced schedule can be created", () => {
    const schedule = Schedule.spaced(500);
    expect(schedule).toBeDefined();
  });
});
