import { createContext, useContext, useEffect, useState } from "react";
import {
  AUTH_API_TIMEOUT_MS,
  apiClient,
  getStoredBackendUrl,
  getApiErrorMessage,
  getStoredToken,
  logApiError,
  setStoredBackendUrl,
  setStoredPiAddress,
  setStoredToken,
} from "../lib/api";
import type { AuthSession, AuthUser, UserRole } from "../types/iris";

interface LoginResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  session: AuthSession | null;
  bootstrapping: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: (options?: { clearBackend?: boolean; clearPi?: boolean }) => void;
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

  const login = async (username: string, password: string): Promise<LoginResult> => {
    const backendUrl = getStoredBackendUrl();
    if (!backendUrl) {
      return { success: false, error: "Backend API is not configured." };
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
          timeout: AUTH_API_TIMEOUT_MS,
        }
      );

      const token = response.data.access_token;
      setStoredToken(token);

      const user = await fetchCurrentUser();
      setSession({ user, token });
      return { success: true };
    } catch (error) {
      logApiError("Login request failed", error);
      setStoredToken(null);
      setSession(null);
      return {
        success: false,
        error: getApiErrorMessage(error, "Login failed. Check username/password and backend API."),
      };
    }
  };

  const logout = (options?: { clearBackend?: boolean; clearPi?: boolean }) => {
    const shouldClearBackend = options?.clearBackend ?? true;
    const shouldClearPi = options?.clearPi ?? true;
    setStoredToken(null);
    if (shouldClearBackend) {
      setStoredBackendUrl(null);
    }
    if (shouldClearPi) {
      setStoredPiAddress(null);
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
