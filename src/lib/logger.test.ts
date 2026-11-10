import { describe, it, expect, vi, afterEach } from "vitest";
import { createLogger, requestId, loggerFor } from "./logger";

describe("logger estruturado", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emite JSON com contexto e msg", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    createLogger({ requestId: "abc", route: "/x" }).info("subiu", { n: 1 });
    const line = JSON.parse(spy.mock.calls[0][0] as string);
    expect(line.level).toBe("info");
    expect(line.requestId).toBe("abc");
    expect(line.msg).toBe("subiu");
    expect(line.meta).toEqual({ n: 1 });
  });

  it("warn/error vão pro stderr", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    createLogger().error("quebrou");
    expect(err).toHaveBeenCalledOnce();
  });

  it("requestId usa x-request-id, senão x-vercel-id, senão gera", () => {
    expect(requestId(new Headers({ "x-request-id": "r1" }))).toBe("r1");
    expect(requestId(new Headers({ "x-vercel-id": "v1" }))).toBe("v1");
    expect(requestId(new Headers()).length).toBeGreaterThan(10);
  });

  it("loggerFor amarra o id da request", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    loggerFor({ headers: new Headers({ "x-request-id": "req-9" }) }).info("oi");
    expect(JSON.parse(spy.mock.calls[0][0] as string).requestId).toBe("req-9");
  });
});
