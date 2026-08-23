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
    vi.mocked(apiClient.post).mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
    vi.mocked(apiClient.get).mockRejectedValue({ isAxiosError: true, response: undefined });
  });

  it("has no user when there is no valid refresh cookie on mount, and never calls /auth/me", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith("/api/v1/auth/refresh"));
    expect(screen.getByTestId("user").textContent).toBe("sem-usuario");
    expect(apiClient.get).not.toHaveBeenCalledWith("/api/v1/auth/me");
  });

  it("restores the session from the refresh cookie on mount", async () => {
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      if (url === "/api/v1/auth/refresh") return Promise.resolve({ data: { access_token: "tok-refreshed" } });
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: "1", name: "Marcelo", email: "marcelo@barbearia.com" } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("marcelo@barbearia.com"));
  });

  it("login stores the token and sets the user from the response", async () => {
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      if (url === "/api/v1/auth/login") return Promise.resolve({ data: { access_token: "tok123" } });
      return Promise.reject({ isAxiosError: true, response: { status: 401 } });
    });
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: "1", name: "Marcelo", email: "marcelo@barbearia.com" } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await userEvent.click(screen.getByText("entrar"));

    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("marcelo@barbearia.com"));
  });

  it("logout clears the user and notifies the server", async () => {
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      if (url === "/api/v1/auth/login") return Promise.resolve({ data: { access_token: "tok123" } });
      if (url === "/api/v1/auth/logout") return Promise.resolve({ data: null });
      return Promise.reject({ isAxiosError: true, response: { status: 401 } });
    });
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
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith("/api/v1/auth/logout"));
  });
});
