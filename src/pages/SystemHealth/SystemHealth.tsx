import { useEffect, useState } from "react";
import { Bell, Clock, Home, RefreshCw, Wifi, Camera, Users } from "lucide-react";
import { apiClient } from "../../lib/api";
import "./SystemHealth.css";

interface SystemStatusResponse { mode: "home" | "away"; alarm_active: boolean; updated_at: string; }
interface EventsResponse { items: Array<{ timestamp: string }>; total: number; }
interface CameraHealth {
  cv2_available: boolean;
  engine_running: boolean;
  camera_opened: boolean;
  camera_ready: boolean;
  latest_frame_ts?: number | null;
  known_faces?: number;
  detection_method?: string;
  yolo_loaded?: boolean;
}

export default function SystemHealth() {
  const [mode, setMode] = useState<"home" | "away">("home");
  const [alarmActive, setAlarmActive] = useState(false);
  const [stateUpdatedAt, setStateUpdatedAt] = useState<string | null>(null);
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  const [totalEvents, setTotalEvents] = useState(0);
  const [cameraHealth, setCameraHealth] = useState<CameraHealth | null>(null);
  const [knownFaces, setKnownFaces] = useState<number | null>(null);
  const [latestFrameTs, setLatestFrameTs] = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState("Never");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadHealth();
    const interval = setInterval(() => { void loadHealth(); }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadHealth() {
    setLoading(true); setError("");
    try {
      const [statusRes, eventsRes] = await Promise.all([
        apiClient.get<SystemStatusResponse>("/api/system/status"),
        apiClient.get<EventsResponse>("/api/events/", { params: { limit: 1, offset: 0 } }),
      ]);
      setMode(statusRes.data.mode);
      setAlarmActive(statusRes.data.alarm_active);
      setStateUpdatedAt(statusRes.data.updated_at);
      setLastDetection(eventsRes.data.items[0]?.timestamp ?? null);
      setTotalEvents(eventsRes.data.total);
      setLastRefreshed(new Date().toLocaleTimeString());

      // Try camera health (optional — only works on Pi)
      try {
        const camRes = await apiClient.get<CameraHealth & { status: string }>("/health/camera");
        setCameraHealth(camRes.data);
        setKnownFaces(camRes.data.known_faces ?? null);
        setLatestFrameTs(camRes.data.latest_frame_ts ?? null);
      } catch {
        setCameraHealth(null);
        setKnownFaces(null);
        setLatestFrameTs(null);
      }
    } catch {
      setError("Failed to load system health from backend.");
    } finally {
      setLoading(false);
    }
  }

  function frameAgeDisplay(): { label: string; type: "good" | "warn" } {
    if (latestFrameTs === null) return { label: "N/A", type: "warn" };
    const ageMs = Date.now() - latestFrameTs * 1000;
    const label = ageMs < 1000 ? `${ageMs}ms ago` : `${(ageMs / 1000).toFixed(1)}s ago`;
    return { label, type: ageMs < 2000 ? "good" : "warn" };
  }

  return (
    <div className="system-health">
      <div className="system-health-header">
        <h1 className="system-health-title">System Health</h1>
        <div className="system-health-refresh">
          <span className="refresh-label">Last refreshed: {lastRefreshed}</span>
          <button className="refresh-btn" onClick={() => void loadHealth()} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="system-health-error">{error}</p>}

      <div className="health-status-row">
        <StatusCard icon={<Home size={18} />} label="Mode" value={mode.toUpperCase()} type={mode === "away" ? "warn" : "good"} />
        <StatusCard icon={<Bell size={18} />} label="Alarm" value={alarmActive ? "TRIGGERED" : "Idle"} type={alarmActive ? "bad" : "good"} />
        <StatusCard icon={<Clock size={18} />} label="Total Events" value={String(totalEvents)} type="neutral" />
        <StatusCard icon={<Clock size={18} />} label="Last Detection" value={lastDetection ? new Date(lastDetection).toLocaleString() : "None"} type="neutral" />
      </div>

      {/* Camera health — shown only when available */}
      <div className="health-status-row" style={{ marginTop: 16 }}>
        <StatusCard
          icon={<Camera size={18} />}
          label="Camera"
          value={cameraHealth ? (cameraHealth.camera_ready ? "Ready" : "Not Ready") : "N/A (Windows)"}
          type={cameraHealth?.camera_ready ? "good" : "neutral"}
        />
        <StatusCard
          icon={<Camera size={18} />}
          label="Detection"
          value={cameraHealth?.detection_method === "yolov8n" ? "YOLOv8n" : "Background Sub."}
          type={cameraHealth?.yolo_loaded ? "good" : "neutral"}
        />
        <StatusCard
          icon={<Wifi size={18} />}
          label="Backend"
          value="Online"
          type="good"
        />
        <StatusCard
          icon={<Clock size={18} />}
          label="State Updated"
          value={stateUpdatedAt ? new Date(stateUpdatedAt).toLocaleString() : "Unknown"}
          type="neutral"
        />
        <StatusCard
          icon={<Users size={18} />}
          label="Known Faces"
          value={knownFaces !== null ? String(knownFaces) : "N/A"}
          type={knownFaces !== null ? "good" : "neutral"}
        />
        <StatusCard
          icon={<Clock size={18} />}
          label="Last Frame"
          value={frameAgeDisplay().label}
          type={frameAgeDisplay().type}
        />
      </div>
    </div>
  );
}

function StatusCard({ icon, label, value, type }: { icon: React.ReactNode; label: string; value: string; type: "good" | "bad" | "warn" | "neutral" }) {
  return (
    <div className="status-card">
      <div className={`status-card-icon status-card-icon--${type}`}>{icon}</div>
      <div>
        <p className="status-card-label">{label}</p>
        <p className={`status-card-value status-card-value--${type}`}>{value}</p>
      </div>
    </div>
  );
}
