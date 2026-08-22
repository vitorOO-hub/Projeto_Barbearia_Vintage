import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../context/ToastContext";
import { apiClient } from "../api/client";
import { Clientes } from "./Clientes";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

function renderClientes() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Clientes />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("Clientes page", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ id: "c1", name: "João Silva", email: "joao@x.com", notes: null, active: true }],
    });
  });

  it("lists clients", async () => {
    renderClientes();
    await waitFor(() => expect(screen.getByText("João Silva")).toBeInTheDocument());
  });

  it("asks for confirmation before removing a client, then soft-deletes it", async () => {
    renderClientes();
    await waitFor(() => expect(screen.getByText("João Silva")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Remover cliente" }));
    expect(screen.getByText(/tem certeza/i)).toBeInTheDocument();

    vi.mocked(apiClient.delete).mockResolvedValue({ data: null });
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/clients/c1"));
  });
});
