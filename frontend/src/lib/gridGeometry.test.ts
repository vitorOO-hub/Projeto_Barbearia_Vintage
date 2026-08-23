import { describe, expect, it } from "vitest";
import {
  PX_PER_MINUTE,
  GRID_START_MINUTES,
  minutesSinceMidnight,
  blockTop,
  blockHeight,
  formatTimeRange,
  clusterOverlaps,
} from "./gridGeometry";

describe("minutesSinceMidnight", () => {
  it("parses HH:MM:SS format", () => {
    expect(minutesSinceMidnight("09:30:00")).toBe(570);
  });
});

describe("blockTop", () => {
  it("calculates pixel offset from grid start", () => {
    expect(blockTop("09:00")).toBe(120);
    expect(GRID_START_MINUTES).toBe(480);
  });
});

describe("blockHeight", () => {
  it("converts duration to pixel height", () => {
    expect(blockHeight(45)).toBe(90);
  });
});

describe("formatTimeRange", () => {
  it("formats start time with duration as HH:MM – HH:MM", () => {
    expect(formatTimeRange("09:00", 45)).toBe("09:00 – 09:45");
  });
});

interface FakeAppt {
  id: string;
  appointment_time: string;
  service_duration_minutes: number;
}

describe("clusterOverlaps", () => {
  it("puts non-overlapping appointments in their own singleton groups", () => {
    const a: FakeAppt = { id: "a", appointment_time: "09:00:00", service_duration_minutes: 30 };
    const b: FakeAppt = { id: "b", appointment_time: "10:00:00", service_duration_minutes: 30 };
    const groups = clusterOverlaps([a, b]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.map((x) => x.id))).toEqual([["a"], ["b"]]);
  });

  it("groups two overlapping appointments together", () => {
    const a: FakeAppt = { id: "a", appointment_time: "09:00:00", service_duration_minutes: 45 };
    const b: FakeAppt = { id: "b", appointment_time: "09:20:00", service_duration_minutes: 30 };
    const groups = clusterOverlaps([a, b]);
    expect(groups).toHaveLength(1);
    expect(groups[0].map((x) => x.id).sort()).toEqual(["a", "b"]);
  });
});
