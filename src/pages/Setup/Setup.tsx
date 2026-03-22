import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, RefreshCw, Server, ShieldCheck, Users, Wifi } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiClient, getStoredPiAddress, probeBackend, setStoredBackendUrl } from "../../lib/api";
import "./Setup.css";

interface BackendAdminAccount {
  id: number;
}

interface BackendAppUser {
  id: number;
}

export default function Setup() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [backendInput, setBackendInput] = useState(getStoredPiAddress() ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    void loadSummary();
  }, []);

  async function loadSummary() {
    setRefreshing(true);
    try {
      const [adminsRes, usersRes, healthRes] = await Promise.all([
        apiClient.get<BackendAdminAccount[]>("/api/auth/admin/accounts"),
        apiClient.get<BackendAppUser[]>("/api/auth/admin/app-users"),
        apiClient.get<{ status?: string }>("/health"),
      ]);
      setAdminCount(adminsRes.data.length);
      setTotalUsers(usersRes.data.length);
      setBackendOnline(healthRes.data.status === "ok");
    } catch {
      setAdminCount(null);
      setTotalUsers(null);
      setBackendOnline(false);
    } finally {
      setRefreshing(false);
    }
  }

  const handleSave = async () => {
    if (!backendInput.trim()) {
      setError("Please enter your Raspberry Pi IP.");
      return;
    }
    setSaving(true);
    setError("");
    const probe = await probeBackend(backendInput);
    if (!probe.ok) {
      setError(probe.message);
      setSaving(false);
      return;
    }
    setStoredBackendUrl(probe.normalizedUrl);
    setSaving(false);
    logout({ clearBackend: false });
    navigate("/login", { replace: true });
  };

  return (
    <div className="setup-page">
      <div className="setup-card">
        <div className="setup-header">
          <div className="setup-icon"><Server size={22} /></div>
          <button className="setup-refresh" onClick={() => void loadSummary()} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            {refreshing ? "Checking..." : "Refresh"}
          </button>
        </div>
        <h1 className="setup-title">Limited Admin Mode</h1>
        <p className="setup-desc">
          Sign-in is active, but full modules stay locked until you set the Raspberry Pi IP.
        </p>
        <div className="setup-summary-grid">
          <SummaryCard
            icon={<ShieldCheck size={14} />}
            label="Admin Users"
            value={adminCount === null ? "N/A" : String(adminCount)}
          />
          <SummaryCard
            icon={<Users size={14} />}
            label="Total App Users"
            value={totalUsers === null ? "N/A" : String(totalUsers)}
          />
          <SummaryCard
            icon={<Activity size={14} />}
            label="Backend Status"
            value={backendOnline ? "Online" : "Offline"}
          />
          <SummaryCard
            icon={<Activity size={14} />}
            label="Frontend Status"
            value="Online"
          />
        </div>
        <div className="setup-field">
          <label>Raspberry Pi IP Address</label>
          <input
            type="text"
            value={backendInput}
            onChange={(e) => setBackendInput(e.target.value)}
            placeholder="e.g. 192.168.1.120"
            onKeyDown={(e) => e.key === "Enter" && void handleSave()}
          />
        </div>
        {error && <p className="setup-error">{error}</p>}
        <button className="setup-btn" onClick={() => void handleSave()} disabled={saving}>
          <Wifi size={16} />
          {saving ? "Connecting..." : "Connect & Continue"}
        </button>
        <p className="setup-hint">
          Example Pi IP: <code>192.168.1.120:8000</code>
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="setup-summary-card">
      <div className="setup-summary-icon">{icon}</div>
      <div>
        <p className="setup-summary-label">{label}</p>
        <p className="setup-summary-value">{value}</p>
      </div>
    </div>
  );
}
