import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient, setAuthToken } from "../api/client";

interface UserOut {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
}

interface AuthContextValue {
  user: UserOut | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const refreshed = await apiClient.post<{ access_token: string }>("/api/v1/auth/refresh");
        setAuthToken(refreshed.data.access_token);
        const me = await apiClient.get<UserOut>("/api/v1/auth/me");
        setUser(me.data);
      } catch {
        setAuthToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  async function login(email: string, password: string) {
    const response = await apiClient.post<{ access_token: string }>("/api/v1/auth/login", { email, password });
    setAuthToken(response.data.access_token);
    const me = await apiClient.get<UserOut>("/api/v1/auth/me");
    setUser(me.data);
  }

  async function logout() {
    setAuthToken(null);
    setUser(null);
    try {
      await apiClient.post("/api/v1/auth/logout");
    } catch {
      // O estado local ja foi limpo; falha ao avisar o servidor nao deve travar o usuario.
    }
  }

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
