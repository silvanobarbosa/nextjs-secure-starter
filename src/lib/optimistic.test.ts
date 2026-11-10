import { describe, it, expect } from "vitest";
import { assertUpdated, OptimisticLockError, optimisticProblem } from "./optimistic";

describe("optimistic lock", () => {
  it("assertUpdated passa quando afetou linha", () => {
    expect(() => assertUpdated(1)).not.toThrow();
  });

  it("assertUpdated lança quando 0/null/undefined (perdeu a corrida)", () => {
    expect(() => assertUpdated(0)).toThrow(OptimisticLockError);
    expect(() => assertUpdated(null)).toThrow(OptimisticLockError);
    expect(() => assertUpdated(undefined)).toThrow(OptimisticLockError);
  });

  it("optimisticProblem é RFC 7807 com 409", () => {
    const p = optimisticProblem();
    expect(p.status).toBe(409);
    expect(p.body.status).toBe(409);
    expect(p.body.type).toContain("409");
  });
});
