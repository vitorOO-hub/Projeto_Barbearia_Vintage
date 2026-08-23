import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../context/ToastContext";
import { apiClient } from "../api/client";
import { Barbeiros } from "./Barbeiros";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

function renderBarbeiros() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Barbeiros />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("Barbeiros page", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: "b1", name: "Carlos Silva" }] });
  });

  it("lists barbers and creates a new one", async () => {
    renderBarbeiros();
    await waitFor(() => expect(screen.getByText("Carlos Silva")).toBeInTheDocument());

    const saveButton = screen.getByRole("button", { name: "Salvar barbeiro" });
    expect(saveButton).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("Nome"), "Marcos Souza");
    expect(saveButton).not.toBeDisabled();

    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: "b2", name: "Marcos Souza" } });
    await userEvent.click(saveButton);

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith("/api/v1/barbers", { name: "Marcos Souza" }));
  });

  it("edits a barber's name inline", async () => {
    renderBarbeiros();
    await waitFor(() => expect(screen.getByText("Carlos Silva")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Editar barbeiro" }));
    const editInput = screen.getByLabelText("Editar nome do barbeiro");
    await userEvent.clear(editInput);
    await userEvent.type(editInput, "Carlos S. Silva");

    vi.mocked(apiClient.put).mockResolvedValue({ data: { id: "b1", name: "Carlos S. Silva" } });
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/api/v1/barbers/b1", { name: "Carlos S. Silva" })
    );
  });

  it("asks for confirmation before removing a barber", async () => {
    renderBarbeiros();
    await waitFor(() => expect(screen.getByText("Carlos Silva")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Remover barbeiro" }));
    expect(screen.getByText(/tem certeza/i)).toBeInTheDocument();

    vi.mocked(apiClient.delete).mockResolvedValue({ data: null });
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/barbers/b1"));
  });
});
