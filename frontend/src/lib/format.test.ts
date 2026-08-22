import { describe, expect, it } from "vitest";
import { formatDateBR, formatTimeBR, formatCurrencyBR } from "./format";

describe("format utils", () => {
  it("formats an ISO date as DD/MM/AAAA", () => {
    expect(formatDateBR("2026-08-25")).toBe("25/08/2026");
  });

  it("formats a time string as 24h HH:mm", () => {
    expect(formatTimeBR("14:30:00")).toBe("14:30");
  });

  it("formats a number as BRL currency", () => {
    expect(formatCurrencyBR(40)).toBe("R$ 40,00");
  });
});
