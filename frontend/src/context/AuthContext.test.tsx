import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "../api/client";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn() } };
});

function Probe() {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.email : "sem-usuario"}</span>
      <button onClick={() => login("marcelo@barbearia.com", "senha123")}>entrar</button>
      <button onClick={logout}>sair</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockRejectedValue({ isAxiosError: true, response: undefined });
  });

  it("starts with no user and calls /auth/me once on mount", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/api/v1/auth/me"));
    expect(screen.getByTestId("user").textContent).toBe("sem-usuario");
  });

  it("login stores the token and sets the user from the response", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { access_token: "tok123" } });
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: "1", name: "Marcelo", email: "marcelo@barbearia.com" } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await userEvent.click(screen.getByText("entrar"));

    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("marcelo@barbearia.com"));
  });

  it("logout clears the user", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { access_token: "tok123" } });
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: "1", name: "Marcelo", email: "marcelo@barbearia.com" } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await userEvent.click(screen.getByText("entrar"));
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("marcelo@barbearia.com"));

    await userEvent.click(screen.getByText("sair"));
    expect(screen.getByTestId("user").textContent).toBe("sem-usuario");
  });
});
