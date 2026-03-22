import { createContext, useContext, useEffect, useState } from "react";
import {
  apiClient,
  getStoredBackendUrl,
  getStoredToken,
  setStoredBackendUrl,
  setStoredToken,
} from "../lib/api";
import type { AuthSession, AuthUser, UserRole } from "../types/iris";

interface AuthContextType {
  session: AuthSession | null;
  bootstrapping: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: (options?: { clearBackend?: boolean }) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const backendUrl = getStoredBackendUrl();
      if (!backendUrl) {
        setStoredToken(null);
        setSession(null);
        setBootstrapping(false);
        return;
      }

      const token = getStoredToken();
      if (!token) {
        setBootstrapping(false);
        return;
      }

      try {
        setStoredToken(token);
        const user = await fetchCurrentUser();
        setSession({ user, token });
      } catch {
        setStoredToken(null);
        setSession(null);
      } finally {
        setBootstrapping(false);
      }
    };

    void restoreSession();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const backendUrl = getStoredBackendUrl();
    if (!backendUrl) {
      return false;
    }

    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);

    try {
      const response = await apiClient.post<{ access_token: string }>(
        "/api/auth/login",
        form.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const token = response.data.access_token;
      setStoredToken(token);

      const user = await fetchCurrentUser();
      setSession({ user, token });
      return true;
    } catch {
      setStoredToken(null);
      setSession(null);
      return false;
    }
  };

  const logout = (options?: { clearBackend?: boolean }) => {
    const shouldClearBackend = options?.clearBackend ?? true;
    setStoredToken(null);
    if (shouldClearBackend) {
      setStoredBackendUrl(null);
    }
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, bootstrapping, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await apiClient.get<{
    id: number;
    username: string;
    role: UserRole;
  }>("/api/auth/me");

  return {
    id: String(response.data.id),
    username: response.data.username,
    name: response.data.username,
    role: response.data.role,
  };
}
