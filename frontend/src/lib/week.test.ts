import { describe, expect, it } from "vitest";
import { TIME_SLOTS, getWeekStart, getWeekDays, shiftWeek, toISODate, slotForTime } from "./week";

describe("week helpers", () => {
  it("builds 24 half-hour slots from 08:00 to 19:30", () => {
    expect(TIME_SLOTS[0]).toBe("08:00");
    expect(TIME_SLOTS[TIME_SLOTS.length - 1]).toBe("19:30");
    expect(TIME_SLOTS).toHaveLength(24);
  });

  it("finds the Sunday that starts the week containing a given date", () => {
    const tuesday = new Date(2026, 7, 25); // 25 Aug 2026 is a Tuesday
    const start = getWeekStart(tuesday);
    expect(toISODate(start)).toBe("2026-08-23");
  });

  it("returns the 7 days of the week starting from weekStart", () => {
    const weekStart = new Date(2026, 7, 23);
    const days = getWeekDays(weekStart).map(toISODate);
    expect(days).toEqual([
      "2026-08-23",
      "2026-08-24",
      "2026-08-25",
      "2026-08-26",
      "2026-08-27",
      "2026-08-28",
      "2026-08-29",
    ]);
  });

  it("shifts the week start forward and backward by whole weeks", () => {
    const weekStart = new Date(2026, 7, 23);
    expect(toISODate(shiftWeek(weekStart, 1))).toBe("2026-08-30");
    expect(toISODate(shiftWeek(weekStart, -1))).toBe("2026-08-16");
  });

  it("floors a time to its containing 30-minute slot", () => {
    expect(slotForTime("14:00")).toBe("14:00");
    expect(slotForTime("14:15")).toBe("14:00");
    expect(slotForTime("14:29")).toBe("14:00");
    expect(slotForTime("14:30")).toBe("14:30");
  });
});
