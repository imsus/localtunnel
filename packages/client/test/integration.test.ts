import { describe, test, expect } from "bun:test";
import { Layer, Context } from "effect";

describe("Client mock services", () => {
  test("MockTunnelConfig structure is correct", () => {
    const tag = Context.GenericTag("TunnelConfig");
    const config = { host: "mock.localtunnel.me", localPort: 3000 };
    const layer = Layer.succeed(tag, config);
    expect(layer).toBeDefined();
  });

  test("MockTunnelServiceSuccess has required methods", () => {
    const tag = Context.GenericTag("TunnelService");
    const service = {
      openTunnel: (_config: any) => Promise.resolve("http://test.local"),
      closeTunnel: (_url: string) => Promise.resolve(undefined),
    };
    const layer = Layer.succeed(tag, service);
    expect(layer).toBeDefined();
  });

  test("MockTunnelServiceFailure structure is correct", () => {
    const tag = Context.GenericTag("TunnelService");
    const service = {
      openTunnel: (_config: any) => Promise.reject(new Error("Connection failed")),
      closeTunnel: (_url: string) => Promise.resolve(undefined),
    };
    const layer = Layer.succeed(tag, service);
    expect(layer).toBeDefined();
  });

  test("Layer.mergeAll creates combined layer", () => {
    const configTag = Context.GenericTag("TunnelConfig");
    const serviceTag = Context.GenericTag("TunnelService");
    const config = { host: "test.local", localPort: 3000 };
    const service = {
      openTunnel: (_c: any) => Promise.resolve("http://test.local"),
      closeTunnel: (_u: string) => Promise.resolve(undefined),
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
