import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { apiClient } from "../api/client";
import { Login } from "./Login";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn() } };
});

describe("Login page", () => {
  it("shows a friendly error message on invalid credentials, in Portuguese", async () => {
    vi.mocked(apiClient.get).mockRejectedValue({ isAxiosError: true, response: undefined });
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { detail: "E-mail ou senha inválidos." } },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText("E-mail"), "marcelo@barbearia.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senhaerrada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByText("E-mail ou senha inválidos.")).toBeInTheDocument());
  });
});
