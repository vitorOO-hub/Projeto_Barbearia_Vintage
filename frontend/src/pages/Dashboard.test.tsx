import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { Dashboard } from "./Dashboard";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return { ...actual, apiClient: { get: vi.fn() } };
});

describe("Dashboard page", () => {
  it("shows today's and this week's counts plus top services", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        appointments_today: 3,
        appointments_this_week: 12,
        top_services: [{ service_name: "Corte", count: 8 }],
      },
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText("3")).toBeInTheDocument());
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Corte")).toBeInTheDocument();
  });
});
