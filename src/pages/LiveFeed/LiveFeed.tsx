import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  ExternalLink,
  Image,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import { getStoredBackendUrl, getStoredPiAddress, getStoredToken } from "../../lib/api";
import "./LiveFeed.css";

interface CameraHealthResponse {
  status: string;
  app: string;
  version: string;
  cv2_available: boolean;
  engine_running: boolean;
  camera_opened: boolean;
  camera_ready: boolean;
  latest_frame_ts?: number | null;
  mode: "home" | "away";
  alarm_active: boolean;
}

export default function LiveFeed() {
  const [fps, setFps] = useState(10);
  const [quality, setQuality] = useState(80);
  const [streamRefreshKey, setStreamRefreshKey] = useState(0);
  const [stillRefreshKey, setStillRefreshKey] = useState(0);
  const [health, setHealth] = useState<CameraHealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState("");
  const [streamError, setStreamError] = useState("");
  const [lastHealthCheck, setLastHealthCheck] = useState<string>("Never");

  const backendBase = getStoredBackendUrl();
  const piAddress = getStoredPiAddress();
  const token = getStoredToken();

  const cameraBase = useMemo(() => {
    if (!piAddress) return undefined;
    return /^https?:\/\//i.test(piAddress) ? piAddress : `http://${piAddress}`;
  }, [piAddress]);

  const streamUrl = useMemo(() => {
    if (!cameraBase) return undefined;

    const params = new URLSearchParams({
      fps: String(fps),
      quality: String(quality),
      v: String(streamRefreshKey),
    });

    if (token) {
      params.set("token", token);
    }

    return `${cameraBase}/api/camera/live?${params.toString()}`;
  }, [cameraBase, fps, quality, streamRefreshKey, token]);

  const frameUrl = useMemo(() => {
    if (!cameraBase) return undefined;

    const params = new URLSearchParams({
      quality: String(quality),
      v: String(stillRefreshKey),
    });

    if (token) {
      params.set("token", token);
    }

    return `${cameraBase}/api/camera/frame?${params.toString()}`;
  }, [cameraBase, quality, stillRefreshKey, token]);

  useEffect(() => {
    void loadHealth();
    const timer = window.setInterval(() => {
      void loadHealth({ silent: true });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [cameraBase, token]);

  async function loadHealth(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setHealthLoading(true);
    }

    setHealthError("");

    try {
      if (!cameraBase) {
        throw new Error("Pi camera URL is not configured.");
      }

      const url = new URL(`${cameraBase}/health/camera`);
      if (token) {
        url.searchParams.set("token", token);
      }

      const res = await fetch(url.toString(), {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error(`Health request failed with status ${res.status}`);
      }

      const data = (await res.json()) as CameraHealthResponse;
      setHealth(data);
      setLastHealthCheck(new Date().toLocaleTimeString());
    } catch {
      setHealth(null);
      setHealthError("Unable to reach camera health endpoint.");
    } finally {
      if (!options?.silent) {
        setHealthLoading(false);
      }
    }
  }

  const reconnectStream = () => {
    setStreamError("");
    setStreamRefreshKey((prev) => prev + 1);
  };

  const refreshStillFrame = () => {
    setStillRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="livefeed-page">
      <section className="livefeed-header">
        <div>
          <h1 className="livefeed-title">Camera Live Feed</h1>
          <p className="livefeed-subtitle">
            Use this page to validate Pi camera connectivity and monitor recognition behavior in real time.
          </p>
        </div>

        <div className="livefeed-header-actions">
          <button
            className="livefeed-btn livefeed-btn--ghost"
            onClick={() => void loadHealth()}
            disabled={healthLoading}
          >
            <RefreshCw size={14} className={healthLoading ? "livefeed-spin" : ""} />
            {healthLoading ? "Checking..." : "Refresh Health"}
          </button>

          <button className="livefeed-btn livefeed-btn--primary" onClick={reconnectStream}>
            <RotateCcw size={14} />
            Reconnect Stream
          </button>

          {streamUrl && (
            <a className="livefeed-btn livefeed-btn--ghost" href={streamUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              Open Stream URL
            </a>
          )}
        </div>
      </section>

      <section className="livefeed-grid">
        <article className="livefeed-panel livefeed-panel--viewer">
          <div className="livefeed-panel-head">
            <p className="livefeed-panel-title">
              <Video size={16} /> Live Stream
            </p>
            <span className={`livefeed-pill ${health?.camera_ready ? "livefeed-pill--good" : "livefeed-pill--warn"}`}>
              {health?.camera_ready ? "Camera Ready" : "Camera Not Ready"}
            </span>
          </div>

          <div className="livefeed-stream-wrap">
            {streamUrl ? (
              <img
                key={streamUrl}
                src={streamUrl}
                alt="Live camera stream"
                className="livefeed-stream"
                onLoad={() => setStreamError("")}
                onError={() => setStreamError("Live stream failed to load. Click Reconnect Stream.")}
              />
            ) : (
              <div className="livefeed-stream-placeholder">
                <Camera size={44} />
                <p>Pi camera URL is unavailable.</p>
              </div>
            )}
          </div>

          {streamError && (
            <p className="livefeed-error">
              <AlertTriangle size={14} />
              {streamError}
            </p>
          )}
        </article>

        <aside className="livefeed-side">
          <article className="livefeed-panel">
            <p className="livefeed-panel-title">
              <SlidersHorizontal size={16} /> Stream Controls
            </p>

            <div className="livefeed-control">
              <label htmlFor="fps">FPS: {fps}</label>
              <input
                id="fps"
                type="range"
                min={1}
                max={30}
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
              />
            </div>

            <div className="livefeed-control">
              <label htmlFor="quality">JPEG Quality: {quality}</label>
              <input
                id="quality"
                type="range"
                min={30}
                max={95}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
            </div>

            <p className="livefeed-hint">
              Start at <strong>10 FPS</strong> and <strong>80 quality</strong> for stable Pi testing.
            </p>
          </article>

          <article className="livefeed-panel">
            <div className="livefeed-panel-head">
              <p className="livefeed-panel-title">
                <Image size={16} /> Single Frame Check
              </p>
              <button className="livefeed-btn livefeed-btn--ghost livefeed-btn--small" onClick={refreshStillFrame}>
                <RefreshCw size={12} />
                Capture
              </button>
            </div>

            <div className="livefeed-frame-wrap">
              {frameUrl ? (
                <img
                  src={frameUrl}
                  alt="Single camera frame"
                  className="livefeed-frame"
                  onError={() => {
                    // Silent on purpose: frame endpoint may fail if camera is not ready.
                  }}
                />
              ) : (
                <div className="livefeed-stream-placeholder livefeed-stream-placeholder--small">
                  <Camera size={24} />
                  <p>No frame URL</p>
                </div>
              )}
            </div>
          </article>

          <article className="livefeed-panel">
            <p className="livefeed-panel-title">
              <Camera size={16} /> Camera Diagnostics
            </p>

            {healthError ? (
              <p className="livefeed-error">
                <AlertTriangle size={14} />
                {healthError}
              </p>
            ) : (
              <div className="livefeed-diagnostics">
                <DiagnosticItem label="Cloud Backend URL" value={backendBase ?? "Not configured"} />
                <DiagnosticItem label="Pi Camera URL" value={cameraBase ?? "Not configured"} />
                <DiagnosticItem label="Last Health Check" value={lastHealthCheck} />
                <DiagnosticItem label="OpenCV Available" value={booleanLabel(health?.cv2_available)} />
                <DiagnosticItem label="Engine Running" value={booleanLabel(health?.engine_running)} />
                <DiagnosticItem label="Camera Opened" value={booleanLabel(health?.camera_opened)} />
                <DiagnosticItem label="Camera Ready" value={booleanLabel(health?.camera_ready)} />
                <DiagnosticItem label="System Mode" value={health?.mode ?? "Unknown"} />
                <DiagnosticItem label="Alarm State" value={health?.alarm_active ? "Active" : "Idle"} />
                <DiagnosticItem
                  label="Latest Frame Timestamp"
                  value={
                    health?.latest_frame_ts
                      ? new Date(health.latest_frame_ts * 1000).toLocaleString()
                      : "Unavailable"
                  }
                />
              </div>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}

function DiagnosticItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="diagnostic-item">
      <span className="diagnostic-label">{label}</span>
      <span className="diagnostic-value">{value}</span>
    </div>
  );
}

function booleanLabel(value: boolean | undefined): string {
  if (value === undefined) return "Unknown";
  return value ? "Yes" : "No";
}