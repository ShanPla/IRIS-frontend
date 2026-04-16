import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  ExternalLink,
  RefreshCw,
  RotateCcw,
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
  detection_method?: string;
  latest_frame_ts?: number | null;
  mode: "home" | "away";
  alarm_active: boolean;
}

function normalizeBaseUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, "");
  const isLocal = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(value);
  const protocol = isLocal ? "http" : "https";
  return `${protocol}://${value}`.replace(/\/+$/, "");
}

function getDynamicCameraBase(storedPiAddress?: string | null): string | undefined {
  if (storedPiAddress?.trim()) {
    return normalizeBaseUrl(storedPiAddress.trim());
  }

  const host = window.location.hostname;
  const protocol = window.location.protocol;

  if (!host) return undefined;

  if (host === "localhost" || host === "127.0.0.1") {
    return undefined;
  }

  if (host.endsWith(".local")) {
    return `${protocol}//${host}:8000`;
  }

  return `http://${host}:8000`;
}

export default function LiveFeed() {
  const [health, setHealth] = useState<CameraHealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState("");
  const [streamError, setStreamError] = useState("");
  const [lastHealthCheck, setLastHealthCheck] = useState<string>("Never");
  const [streaming, setStreaming] = useState(true);

  // Fetch-based frame polling state
  const [streamBlobUrl, setStreamBlobUrl] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const streamingRef = useRef(true);
  const prevStreamBlob = useRef<string | null>(null);
  const consecutiveFailsRef = useRef(0);

  const backendBase = getStoredBackendUrl();
  const piAddress = getStoredPiAddress();
  const token = getStoredToken();

  const cameraBase = useMemo(() => {
    return getDynamicCameraBase(piAddress);
  }, [piAddress]);

  // Fetch a single frame as blob URL
  const fetchFrame = useCallback(async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) return null;
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }, []);

  // Build frame URL
  const buildFrameUrl = useCallback(() => {
    if (!cameraBase) return null;
    const params = new URLSearchParams({ quality: "80", grayscale: "true" });
    if (token) params.set("token", token);
    return `${cameraBase}/api/camera/frame?${params.toString()}`;
  }, [cameraBase, token]);

  // Polling loop for live stream (fetch frame repeatedly)
  useEffect(() => {
    streamingRef.current = streaming;
    if (!streaming || !cameraBase) return;

    let cancelled = false;
    const delay = 200; // ~5 FPS

    const poll = async () => {
      while (!cancelled && streamingRef.current) {
        const url = buildFrameUrl();
        if (!url) break;

        const blobUrl = await fetchFrame(`${url}&v=${Date.now()}`);
        if (cancelled) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          break;
        }

        if (blobUrl) {
          consecutiveFailsRef.current = 0;
          setReconnecting(false);
          setStreamBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return blobUrl;
          });
          setStreamError("");
        } else {
          consecutiveFailsRef.current += 1;
          if (consecutiveFailsRef.current >= 5) {
            setReconnecting(true);
            setStreamError("");
          } else {
            setStreamError("Failed to fetch frame. Check camera connection.");
          }
        }

        // Back off when failing to avoid hammering a struggling Pi
        const backoff = consecutiveFailsRef.current >= 5
          ? Math.min(2000, delay * 3)
          : delay;
        await new Promise((r) => setTimeout(r, backoff));
      }
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [streaming, cameraBase, token, buildFrameUrl, fetchFrame]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (prevStreamBlob.current) URL.revokeObjectURL(prevStreamBlob.current);
    };
  }, []);

  // Health check
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
      if (token) url.searchParams.set("token", token);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Health request failed with status ${res.status}`);
      const data = (await res.json()) as CameraHealthResponse;
      setHealth(data);
      setLastHealthCheck(new Date().toLocaleTimeString());
    } catch {
      setHealth(null);
      setHealthError("Unable to reach camera health endpoint.");
    } finally {
      if (!options?.silent) setHealthLoading(false);
    }
  }

  const toggleStreaming = () => {
    setStreaming((prev) => !prev);
    if (!streaming) setStreamError("");
  };

  const streamDisplayUrl = buildFrameUrl();

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

          <button className="livefeed-btn livefeed-btn--primary" onClick={toggleStreaming}>
            <RotateCcw size={14} />
            {streaming ? "Stop Stream" : "Start Stream"}
          </button>

          {streamDisplayUrl && (
            <a className="livefeed-btn livefeed-btn--ghost" href={streamDisplayUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              Open Frame URL
            </a>
          )}
        </div>
      </section>

      <section className="livefeed-grid">
        <article className="livefeed-panel livefeed-panel--viewer">
          <div className="livefeed-panel-head">
            <p className="livefeed-panel-title">
              <Video size={16} /> Live Stream {streaming ? "(Polling)" : "(Stopped)"}
            </p>
            <span className={`livefeed-pill ${health?.camera_ready ? "livefeed-pill--good" : "livefeed-pill--warn"}`}>
              {health?.camera_ready ? "Camera Ready" : "Camera Not Ready"}
            </span>
          </div>

          <div className="livefeed-stream-wrap">
            {reconnecting ? (
              <div className="livefeed-stream-placeholder">
                <RefreshCw size={44} className="livefeed-spin" />
                <p>Camera stream interrupted — reconnecting...</p>
              </div>
            ) : streamBlobUrl ? (
              <img
                src={streamBlobUrl}
                alt="Live camera stream"
                className="livefeed-stream"
              />
            ) : (
              <div className="livefeed-stream-placeholder">
                <Camera size={44} />
                <p>{streaming ? "Connecting to camera..." : "Stream stopped"}</p>
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
                <DiagnosticItem label="Stored Pi Address" value={piAddress ?? "Not configured"} />
                <DiagnosticItem label="Resolved Pi Camera URL" value={cameraBase ?? "Not configured"} />
                <DiagnosticItem label="Last Health Check" value={lastHealthCheck} />
                <DiagnosticItem label="OpenCV Available" value={booleanLabel(health?.cv2_available)} />
                <DiagnosticItem label="Engine Running" value={booleanLabel(health?.engine_running)} />
                <DiagnosticItem label="Camera Opened" value={booleanLabel(health?.camera_opened)} />
                <DiagnosticItem label="Camera Ready" value={booleanLabel(health?.camera_ready)} />
                <DiagnosticItem label="Detection Method" value={health?.detection_method === "yolov8n" ? "YOLOv8n" : health?.detection_method ?? "Unknown"} />
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
