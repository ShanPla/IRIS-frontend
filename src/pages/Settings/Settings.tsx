import { useEffect, useState } from "react";
import { Bell, Save, Shield, Wifi } from "lucide-react";
import { apiClient, getStoredPiAddress, normalizePiAddress, setStoredPiAddress } from "../../lib/api";
import type { SecurityMode } from "../../types/iris";
import "./Settings.css";

interface SystemStatusResponse { mode: string; }
interface SystemConfigResponse {
  motion_area_threshold: number;
  detection_cooldown_seconds: number;
  face_recognition_tolerance: number;
  alarm_escalation_delay: number;
  notifications_enabled: boolean;
  include_snapshot_in_alerts: boolean;
}

export default function Settings() {
  const [mode, setMode] = useState<SecurityMode>("home");
  const [sensitivity, setSensitivity] = useState(50);
  const [alarmDelay, setAlarmDelay] = useState(10);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [snapshotAlerts, setSnapshotAlerts] = useState(true);
  const [motionAreaThreshold, setMotionAreaThreshold] = useState(1500);
  const [detectionCooldown, setDetectionCooldown] = useState(10);
  const [piAddress, setPiAddress] = useState(getStoredPiAddress() ?? "");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingConnection, setSavingConnection] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { void loadSettings(); }, []);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError("");
    const faceTolerance = sensitivityToTolerance(sensitivity);
    try {
      await apiClient.put("/api/system/mode", { mode });
      await apiClient.put("/api/system/config", {
        motion_area_threshold: motionAreaThreshold,
        detection_cooldown_seconds: detectionCooldown,
        face_recognition_tolerance: faceTolerance,
        alarm_escalation_delay: alarmDelay,
        notifications_enabled: notificationsEnabled,
        include_snapshot_in_alerts: snapshotAlerts,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save settings to backend.");
    } finally {
      setSaving(false);
    }
  };

  async function loadSettings() {
    setLoading(true); setError("");
    try {
      const [statusRes, configRes] = await Promise.all([
        apiClient.get<SystemStatusResponse>("/api/system/status"),
        apiClient.get<SystemConfigResponse>("/api/system/config"),
      ]);
      setMode(statusRes.data.mode === "away" ? "away" : "home");
      setSensitivity(toleranceToSensitivity(configRes.data.face_recognition_tolerance));
      setAlarmDelay(configRes.data.alarm_escalation_delay);
      setNotificationsEnabled(configRes.data.notifications_enabled);
      setSnapshotAlerts(configRes.data.include_snapshot_in_alerts);
      setMotionAreaThreshold(configRes.data.motion_area_threshold);
      setDetectionCooldown(configRes.data.detection_cooldown_seconds);
    } catch {
      setError("Failed to load settings from backend.");
    } finally {
      setLoading(false);
    }
  }

  const handleSaveConnection = async () => {
    if (!piAddress.trim()) { setError("Please enter a Raspberry Pi IP."); return; }
    setSavingConnection(true);
    const normalizedPi = normalizePiAddress(piAddress);
    if (!normalizedPi) { setError("Invalid Raspberry Pi IP address."); setSavingConnection(false); return; }
    setStoredPiAddress(normalizedPi);
    setError("");
    setSavingConnection(false);
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <button className="settings-save-btn" onClick={() => void handleSave()} disabled={loading || saving}>
          <Save size={15} />
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>

      {error && <p className="settings-error">{error}</p>}
      {loading && <p className="settings-loading">Loading backend settings...</p>}

      {/* Security Mode */}
      <section className="settings-section">
        <div className="settings-section-title"><Shield size={16} />Security Mode</div>
        <p className="settings-section-desc">
          Away mode applies stricter detection. Home mode is suitable for occupied residences.
        </p>
        <div className="mode-toggle">
          <button className={`mode-btn ${mode === "home" ? "mode-btn--active" : ""}`} onClick={() => setMode("home")} disabled={loading}>Home</button>
          <button className={`mode-btn ${mode === "away" ? "mode-btn--active" : ""}`} onClick={() => setMode("away")} disabled={loading}>Away</button>
        </div>
        <p className="mode-description">
          {mode === "home"
            ? "Home mode: alarm triggers only for unknown individuals."
            : "Away mode: stricter sensitivity. Any unverified presence triggers an immediate alert."}
        </p>
      </section>

      {/* Detection Sensitivity */}
      <section className="settings-section">
        <div className="settings-section-title"><Shield size={16} />Detection Sensitivity</div>
        <p className="settings-section-desc">Controls how strictly faces must match to be recognized.</p>
        <div className="slider-row">
          <span className="slider-label">Low</span>
          <input type="range" min={0} max={100} value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} className="slider" disabled={loading} />
          <span className="slider-label">High</span>
          <span className="slider-value">{sensitivity}%</span>
        </div>
      </section>

      {/* Alarm Escalation Delay */}
      <section className="settings-section">
        <div className="settings-section-title"><Bell size={16} />Alarm Escalation Delay</div>
        <p className="settings-section-desc">How long (in seconds) before triggering the local audible alarm after a soft alert.</p>
        <div className="slider-row">
          <span className="slider-label">0s</span>
          <input type="range" min={0} max={60} value={alarmDelay} onChange={(e) => setAlarmDelay(Number(e.target.value))} className="slider" disabled={loading} />
          <span className="slider-label">60s</span>
          <span className="slider-value">{alarmDelay}s</span>
        </div>
      </section>

      {/* Notifications */}
      <section className="settings-section">
        <div className="settings-section-title"><Bell size={16} />Notifications</div>
        <div className="toggle-row">
          <div>
            <p className="toggle-label">Enable Mobile Notifications</p>
            <p className="toggle-desc">Send alerts to homeowner's mobile device via FCM.</p>
          </div>
          <button className={`toggle-switch ${notificationsEnabled ? "toggle-switch--on" : ""}`} onClick={() => setNotificationsEnabled(!notificationsEnabled)} disabled={loading}>
            <span className="toggle-knob" />
          </button>
        </div>
        <div className="toggle-row">
          <div>
            <p className="toggle-label">Include Snapshot in Alerts</p>
            <p className="toggle-desc">Attach a snapshot image to every mobile notification.</p>
          </div>
          <button className={`toggle-switch ${snapshotAlerts ? "toggle-switch--on" : ""}`} onClick={() => setSnapshotAlerts(!snapshotAlerts)} disabled={loading}>
            <span className="toggle-knob" />
          </button>
        </div>
      </section>

      {/* Pi Connection */}
      <section className="settings-section">
        <div className="settings-section-title"><Wifi size={16} />Raspberry Pi Connection</div>
        <p className="settings-section-desc">Change the connected Raspberry Pi IP used for device identification.</p>
        <div className="settings-input-row">
          <label>Pi IP Address</label>
          <input type="text" value={piAddress} onChange={(e) => setPiAddress(e.target.value)} className="settings-input" placeholder="e.g. 192.168.1.120" disabled={savingConnection} />
          <button className="settings-connection-btn" onClick={() => void handleSaveConnection()} disabled={savingConnection}>
            {savingConnection ? "Saving..." : "Save Pi IP"}
          </button>
        </div>
      </section>
    </div>
  );
}

function toleranceToSensitivity(tolerance: number): number {
  return Math.max(0, Math.min(100, Math.round(((tolerance - 0.1) / 0.9) * 100)));
}
function sensitivityToTolerance(sensitivity: number): number {
  return Number((0.1 + (Math.max(0, Math.min(100, sensitivity)) / 100) * 0.9).toFixed(2));
}
