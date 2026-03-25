import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasBackendUrlConfigured, hasPiBackendConfigured } from "../../lib/api";
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const backendConfigured = hasBackendUrlConfigured();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await login(username, password);
    setSubmitting(false);

    if (result.success) {
      navigate(hasPiBackendConfigured() ? "/dashboard" : "/setup");
    } else {
      setError(result.error ?? "Login failed. Check username/password and backend API.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">IRIS</div>
        <p className="login-subtitle">Integrated Recognition for Intrusion System</p>
        <p className="login-admin-label">Admin Access</p>

        {!backendConfigured && <p className="login-error">Backend API is not configured.</p>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
            />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-btn" disabled={submitting || !backendConfigured}>
            {submitting ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
