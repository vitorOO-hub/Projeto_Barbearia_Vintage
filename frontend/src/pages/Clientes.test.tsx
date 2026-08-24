import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
      data: [{ id: "c1", name: "João Silva", email: "joao@x.com", phone: "(11) 957645612", notes: null, active: true }],
    });
  });

  it("lists clients", async () => {
    renderClientes();
    await waitFor(() => expect(screen.getByText("João Silva")).toBeInTheDocument());
  });

  it("shows the client's phone in the list when present", async () => {
    renderClientes();
    await waitFor(() => expect(screen.getByText("(11) 957645612")).toBeInTheDocument());
  });

  it("keeps Salvar cliente disabled until name and email are both filled, then submits with phone", async () => {
    renderClientes();
    await waitFor(() => expect(screen.getByText("João Silva")).toBeInTheDocument());

    const saveButton = screen.getByRole("button", { name: "Salvar cliente" });
    expect(saveButton).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("Nome"), "Maria Costa");
    expect(saveButton).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("E-mail"), "maria@x.com");
    expect(saveButton).not.toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("(11) 957645612"), "(11) 912345678");

    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: "c2", name: "Maria Costa", email: "maria@x.com", phone: "(11) 912345678", notes: null, active: true },
    });
    await userEvent.click(saveButton);

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/clients", {
        name: "Maria Costa",
        email: "maria@x.com",
        phone: "(11) 912345678",
      })
    );
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

  it("shows an inactive client with an Ativar button instead of Remover, and reactivates it", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ id: "c1", name: "João Silva", email: "joao@x.com", phone: null, notes: null, active: false }],
    });

    renderClientes();
    await waitFor(() => expect(screen.getByText("João Silva")).toBeInTheDocument());

    expect(screen.getByText("Inativo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover cliente" })).not.toBeInTheDocument();

    vi.mocked(apiClient.put).mockResolvedValue({
      data: { id: "c1", name: "João Silva", email: "joao@x.com", phone: null, notes: null, active: true },
    });
    await userEvent.click(screen.getByRole("button", { name: "Ativar cliente" }));

    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith("/api/v1/clients/c1", { active: true }));
  });

  it("opens the edit modal pre-filled with the client's data and saves the changes", async () => {
    renderClientes();
    await waitFor(() => expect(screen.getByText("João Silva")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Editar cliente" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Nome")).toHaveValue("João Silva");

    await userEvent.clear(within(dialog).getByLabelText("Nome"));
    await userEvent.type(within(dialog).getByLabelText("Nome"), "João S. Silva");

    vi.mocked(apiClient.put).mockResolvedValue({
      data: { id: "c1", name: "João S. Silva", email: "joao@x.com", notes: null, active: true },
    });
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar cliente" }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/api/v1/clients/c1", {
        name: "João S. Silva",
        email: "joao@x.com",
        phone: "(11) 957645612",
      })
    );
  });
});
