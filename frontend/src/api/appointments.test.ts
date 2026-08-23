import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { checkAvailability } from "./appointments";

vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return { ...actual, apiClient: { get: vi.fn() } };
});

describe("checkAvailability", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { available: false, conflict_with: "10:00 – 10:30" } });
  });

  it("calls the check-availability endpoint with the right params and returns the payload", async () => {
    const result = await checkAvailability({ barberId: "b1", date: "2026-08-25", time: "10:10", serviceId: "s1" });

    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/appointments/check-availability", {
      params: { barber_id: "b1", date: "2026-08-25", time: "10:10", service_id: "s1" },
    });
    expect(result).toEqual({ available: false, conflict_with: "10:00 – 10:30" });
  });
});
