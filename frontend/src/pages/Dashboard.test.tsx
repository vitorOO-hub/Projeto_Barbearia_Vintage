import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { AuthProvider } from "../context/AuthContext";
import { Dashboard } from "./Dashboard";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return { ...actual, apiClient: { get: vi.fn() } };
});

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const SUMMARY = {
  appointments_today: 3,
  appointments_this_week: 12,
  top_services: [{ service_name: "Corte", count: 8 }],
};

describe("Dashboard page", () => {
  it("shows today's and this week's counts plus top services", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/v1/auth/me") return Promise.resolve({ data: { id: "u1", name: "Marcelo", email: "m@x.com", is_admin: false } });
      if (url === "/api/v1/dashboard/summary") return Promise.resolve({ data: SUMMARY });
      return Promise.reject(new Error(`unexpected url ${url}`));
    });

    renderDashboard();

    await waitFor(() => expect(screen.getByText("3")).toBeInTheDocument());
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Corte")).toBeInTheDocument();
  });

  it("hides the revenue panel for non-admin users", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/v1/auth/me") return Promise.resolve({ data: { id: "u1", name: "Marcelo", email: "m@x.com", is_admin: false } });
      if (url === "/api/v1/dashboard/summary") return Promise.resolve({ data: SUMMARY });
      return Promise.reject(new Error(`unexpected url ${url}`));
    });

    renderDashboard();

    await waitFor(() => expect(screen.getByText("Corte")).toBeInTheDocument());
    expect(screen.queryByText("Faturamento da semana")).not.toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalledWith("/api/v1/dashboard/revenue");
  });

  it("shows the revenue panel for admin users", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/v1/auth/me") return Promise.resolve({ data: { id: "u1", name: "Marcelo", email: "m@x.com", is_admin: true } });
      if (url === "/api/v1/dashboard/summary") return Promise.resolve({ data: SUMMARY });
      if (url === "/api/v1/dashboard/revenue") {
        return Promise.resolve({
          data: { total_this_week: 105, by_barber: [{ barber_name: "Carlos Silva", total: 80 }] },
        });
      }
      return Promise.reject(new Error(`unexpected url ${url}`));
    });

    renderDashboard();

    await waitFor(() => expect(screen.getByText("Faturamento da semana")).toBeInTheDocument());
    expect(screen.getByText("Carlos Silva")).toBeInTheDocument();
  });
});
