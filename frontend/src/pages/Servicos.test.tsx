import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../context/ToastContext";
import { apiClient } from "../api/client";
import { Servicos } from "./Servicos";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

function renderServicos() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Servicos />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("Servicos page", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ id: "s1", name: "Corte", duration_minutes: 30, price: 40, active: true }],
    });
  });

  it("lists services", async () => {
    renderServicos();
    await waitFor(() => expect(screen.getByText("Corte")).toBeInTheDocument());
  });

  it("shows an inactive service with the Inativo badge", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ id: "s1", name: "Corte", duration_minutes: 30, price: 40, active: false }],
    });

    renderServicos();
    await waitFor(() => expect(screen.getByText("Inativo")).toBeInTheDocument());
  });

  it("asks for confirmation before permanently deleting a service", async () => {
    renderServicos();
    await waitFor(() => expect(screen.getByText("Corte")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Excluir serviço" }));
    expect(screen.getByText(/não pode ser desfeita/i)).toBeInTheDocument();

    vi.mocked(apiClient.delete).mockResolvedValue({ data: null });
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/services/s1"));
  });
});
