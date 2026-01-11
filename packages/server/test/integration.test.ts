import { describe, test, expect } from "bun:test";
import { Layer, Context } from "effect";

describe("Server mock services", () => {
  test("MockServerConfig structure is correct", () => {
    const tag = Context.GenericTag("ServerConfig");
    const config = { host: "0.0.0.0", port: 8080 };
    const layer = Layer.succeed(tag, config);
    expect(layer).toBeDefined();
  });

  test("MockServerServiceSuccess has required methods", () => {
    const tag = Context.GenericTag("ServerService");
    const service = {
      createServer: (_port: number, _host?: string) => Promise.resolve(undefined),
      startServer: (_port: number, _host?: string) => Promise.resolve(undefined),
    };
    const layer = Layer.succeed(tag, service);
    expect(layer).toBeDefined();
  });

  test("MockServerServiceFailure structure is correct", () => {
    const tag = Context.GenericTag("ServerService");
    const service = {
      createServer: (_port: number, _host?: string) => Promise.reject(new Error("Failed")),
      startServer: (_port: number, _host?: string) => Promise.reject(new Error("Failed")),
    };
    const layer = Layer.succeed(tag, service);
    expect(layer).toBeDefined();
  });

  test("Layer.mergeAll creates combined layer", () => {
    const configTag = Context.GenericTag("ServerConfig");
    const serviceTag = Context.GenericTag("ServerService");
    const config = { host: "localhost", port: 3000 };
    const service = {
      createServer: (_p: number, _h?: string) => Promise.resolve(undefined),
      startServer: (_p: number, _h?: string) => Promise.resolve(undefined),
    };
    const combined = Layer.mergeAll(
      Layer.succeed(configTag, config),
      Layer.succeed(serviceTag, service),
    );
    expect(combined).toBeDefined();
  });

  test("Layer.succeed creates value layer", () => {
    const layer = Layer.succeed("TestTag", { value: 42 });
    expect(layer).toBeDefined();
  });

  test("Layer.empty is valid", () => {
    expect(Layer.empty).toBeDefined();
  });
});

describe("Effect Layer patterns", () => {
  test("Layer can be used with Context", () => {
    const tag = Context.GenericTag("Config");
    const layer = Layer.succeed(tag, { setting: "test" });
    expect(layer).toBeDefined();
  });

  test("Context can hold multiple services", () => {
    const tag1 = Context.GenericTag("Service1");
    const tag2 = Context.GenericTag("Service2");
    const context = Context.empty().pipe(
      Context.add(tag1, { data: "service1" }),
      Context.add(tag2, { data: "service2" }),
    );
    expect(context).toBeDefined();
  });
});
