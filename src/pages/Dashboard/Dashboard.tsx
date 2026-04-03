import { useEffect, useRef, useState } from "react";
import { Camera, ShieldAlert, ShieldCheck, BellOff, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { apiClient, buildApiUrl, getStoredBackendUrl, getStoredToken } from "../../lib/api";
import "./Dashboard.css";

interface SystemStatus { mode: "home" | "away"; alarm_active: boolean; updated_at: string; }
interface BackendEvent { id: number; event_type: "authorized" | "unknown" | "unverifiable"; snapshot_path: string | null; alarm_triggered: boolean; timestamp: string; matched_name: string | null; }

export default function Dashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [allEvents, setAllEvents] = useState<BackendEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingMode, setTogglingMode] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [statusRes, eventsRes, allEventsRes] = await Promise.all([
        apiClient.get<SystemStatus>("/api/system/status"),
        apiClient.get<{ items: BackendEvent[] }>("/api/events/", { params: { limit: 5 } }),
        apiClient.get<{ items: BackendEvent[] }>("/api/events/", { params: { limit: 100 } }),
      ]);
      setStatus(statusRes.data);
      setEvents(eventsRes.data.items);
      setAllEvents(allEventsRes.data.items);
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();

    // Auto-refresh every 10 seconds
    const refreshInterval = setInterval(() => { void load(); }, 10000);

    // WebSocket live feed
    const base = getStoredBackendUrl();
    const token = getStoredToken();
    if (base && token) {
      const wsBase = base.replace(/^http/, "ws");
      const ws = new WebSocket(`${wsBase}/ws/live?token=${token}`);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as { type: string; event_type?: string; snapshot_url?: string; alarm_triggered?: boolean; timestamp?: string; id?: number; mode?: string; alarm_active?: boolean; matched_name?: string };
          if (msg.type === "security_event") {
            const newEvent: BackendEvent = {
              id: msg.id ?? Date.now(),
              event_type: (msg.event_type ?? "unverifiable") as BackendEvent["event_type"],
              snapshot_path: msg.snapshot_url ?? null,
              alarm_triggered: msg.alarm_triggered ?? false,
              timestamp: msg.timestamp ?? new Date().toISOString(),
              matched_name: msg.matched_name ?? null,
            };
            setEvents((prev) => [newEvent, ...prev].slice(0, 5));
            setAllEvents((prev) => [newEvent, ...prev]);
          }
          if (msg.type === "mode_change") setStatus((s) => s ? { ...s, mode: msg.mode as "home" | "away" } : s);
          if (msg.type === "alarm_change") setStatus((s) => s ? { ...s, alarm_active: msg.alarm_active ?? false } : s);
        } catch { /* ignore */ }
      };
      const ping = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send("ping"); }, 30000);
      ws.onclose = () => clearInterval(ping);
      wsRef.current = ws;
    }

    return () => {
      clearInterval(refreshInterval);
      wsRef.current?.close();
    };
  }, []);

  const silenceAlarm = async () => {
    await apiClient.put("/api/system/alarm", { active: false });
    setStatus((s) => s ? { ...s, alarm_active: false } : s);
  };

  const toggleMode = async () => {
    if (!status || togglingMode) return;
    const newMode = status.mode === "home" ? "away" : "home";
    setTogglingMode(true);
    try {
      await apiClient.put("/api/system/mode", { mode: newMode });
      setStatus((s) => s ? { ...s, mode: newMode } : s);
    } catch {
      setError("Failed to toggle mode.");
    } finally {
      setTogglingMode(false);
    }
  };

  // Compute 24h summary counts
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const events24h = allEvents.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
  const countAuthorized = events24h.filter((e) => e.event_type === "authorized").length;
  const countUnknown = events24h.filter((e) => e.event_type === "unknown").length;
  const countUnverifiable = events24h.filter((e) => e.event_type === "unverifiable").length;

  // Latest event for recognition card
  const latestEvent = events[0] ?? null;

  const colorMap: Record<string, string> = {
    authorized: "text-green-400",
    unknown: "text-red-400",
    unverifiable: "text-yellow-400",
  };
  const labelMap: Record<string, string> = {
    authorized: "Authorized",
    unknown: "Unknown Person",
    unverifiable: "Unverifiable",
  };

  return (
    <div className="dashboard">
      <div className="flex items-center justify-between mb-6">
        <h1 className="dashboard-title">Dashboard</h1>
        <div className="flex items-center gap-3">
          {status?.alarm_active && (
            <button onClick={() => void silenceAlarm()} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold animate-pulse transition-colors">
              <BellOff size={15} /> Silence Alarm
            </button>
          )}
          <button onClick={() => void load()} disabled={loading} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="dashboard-stats">
        <div
          className="stat-card stat-card--clickable"
          onClick={() => void toggleMode()}
          title={`Click to switch to ${status?.mode === "home" ? "away" : "home"} mode`}
        >
          <div className="stat-icon">
            {status?.mode === "away"
              ? <ToggleRight className="icon-yellow" />
              : <ToggleLeft className="icon-cyan" />}
          </div>
          <div>
            <p className="stat-label">Mode</p>
            <p className="stat-value">{status?.mode?.toUpperCase() ?? "—"}</p>
            <p className="stat-hint">Click to toggle</p>
          </div>
        </div>
        <StatCard icon={<Camera className="icon-cyan" />} label="Camera" value="Active" />
        <StatCard
          icon={status?.alarm_active ? <ShieldAlert className="text-red-400" /> : <ShieldCheck className="text-green-400" />}
          label="Alarm"
          value={status?.alarm_active ? "TRIGGERED" : "Safe"}
        />
        <StatCard icon={<ShieldAlert className="icon-yellow" />} label="Last Alert" value={events[0] ? labelMap[events[0].event_type] : "None"} />
      </div>

      {/* Events (24h) summary */}
      <div className="dashboard-summary">
        <p className="feed-label">Events (24h)</p>
        <div className="summary-counts">
          <div className="summary-item summary-item--green">
            <span className="summary-dot" />
            <span className="summary-count">{countAuthorized}</span>
            <span className="summary-label">Authorized</span>
          </div>
          <div className="summary-item summary-item--red">
            <span className="summary-dot" />
            <span className="summary-count">{countUnknown}</span>
            <span className="summary-label">Unknown</span>
          </div>
          <div className="summary-item summary-item--yellow">
            <span className="summary-dot" />
            <span className="summary-count">{countUnverifiable}</span>
            <span className="summary-label">Unverifiable</span>
          </div>
        </div>
      </div>

      {/* Latest Recognition card */}
      <div className="dashboard-latest">
        <p className="feed-label">Latest Recognition</p>
        {latestEvent ? (
          <div className="latest-card">
            {buildApiUrl(latestEvent.snapshot_path) ? (
              <img src={buildApiUrl(latestEvent.snapshot_path)} alt="snapshot" className="latest-snapshot" />
            ) : (
              <div className="latest-snapshot-placeholder"><Camera size={24} className="text-gray-500" /></div>
            )}
            <div className="latest-info">
              <p className={`latest-name ${colorMap[latestEvent.event_type]}`}>
                {latestEvent.matched_name ?? labelMap[latestEvent.event_type]}
              </p>
              <p className="latest-meta">
                {labelMap[latestEvent.event_type]}
                {latestEvent.matched_name ? ` · ${latestEvent.matched_name}` : ""}
              </p>
              <p className="latest-meta">{new Date(latestEvent.timestamp).toLocaleString()}</p>
            </div>
            {latestEvent.alarm_triggered && (
              <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded-full flex-shrink-0">Alarm</span>
            )}
          </div>
        ) : (
          <div className="latest-card">
            <div className="latest-snapshot-placeholder"><Camera size={24} className="text-gray-500" /></div>
            <div className="latest-info">
              <p className="latest-name text-gray-500">No events yet</p>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-feed">
        <p className="feed-label">Recent Events</p>
        {loading ? (
          <div className="feed-placeholder"><p className="text-gray-500 text-sm">Loading...</p></div>
        ) : events.length === 0 ? (
          <div className="feed-placeholder"><Camera size={48} /><p className="text-gray-500 text-sm mt-2">No events yet</p></div>
        ) : (
          <div className="flex flex-col gap-3 mt-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-center gap-4 bg-gray-900 rounded-xl p-3 border border-gray-800">
                {buildApiUrl(event.snapshot_path) ? (
                  <img src={buildApiUrl(event.snapshot_path)} alt="snapshot" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0"><Camera size={20} className="text-gray-600" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${colorMap[event.event_type]}`}>
                    {labelMap[event.event_type]}{event.matched_name ? ` — ${event.matched_name}` : ""}
                  </p>
                  <p className="text-gray-500 text-xs">{new Date(event.timestamp).toLocaleString()}</p>
                </div>
                {event.alarm_triggered && <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded-full flex-shrink-0">Alarm</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div><p className="stat-label">{label}</p><p className="stat-value">{value}</p></div>
    </div>
  );
}
