import { createContext, useContext, useState, useEffect } from "react";
import type { AdminUser, AuthSession } from "../types/iris";
import users from "../data/users.json";

interface AuthContextType {
  session: AuthSession | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("iris_session");
    if (stored) setSession(JSON.parse(stored));
  }, []);

  const login = (username: string, password: string): boolean => {
    const match = (users as AdminUser[]).find(
      (u) => u.username === username && u.password === password
    );
    if (!match) return false;
    const { password: _, ...userWithoutPassword } = match;
    const newSession: AuthSession = { user: userWithoutPassword };
    setSession(newSession);
    localStorage.setItem("iris_session", JSON.stringify(newSession));
    return true;
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem("iris_session");
  };

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}