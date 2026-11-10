import { describe, it, expect } from "vitest";
import { churnRisk } from "./retention";

describe("retention.churnRisk", () => {
  it("baixo quando ativo e sem sinais", () => {
    expect(churnRisk({ daysSinceActive: 2 })).toBe("low");
  });
  it("médio com inatividade moderada", () => {
    expect(churnRisk({ daysSinceActive: 10 })).toBe("medium");
  });
  it("alto com inatividade longa + pagamento falho", () => {
    expect(churnRisk({ daysSinceActive: 20, failedPayments: 1 })).toBe("high");
  });
  it("alto com queda de uso forte", () => {
    expect(churnRisk({ daysSinceActive: 8, usageDropPct: 60 })).toBe("high");
  });
});
