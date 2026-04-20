import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import Hls from "hls.js";
import { Radio } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getStoredBackendUrl,
  normalizeBackendUrl,
  probeBackend,
} from "../../lib/api";
import "./Login.css";

const LOGIN_VIDEO_SRC = "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";
const FOOTER_ITEMS = [
  { label: "Developed by SSR", tone: "strong" as const },
  {
    label: "Linked In Reymark",
    href: "https://www.linkedin.com/in/reymark-de-castro-459598389",
    tone: "strong" as const,
  },
  { label: "Version: 1.0", tone: "muted" as const },
  { label: "IRIS Control Panel", tone: "muted" as const },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const marqueeTrackRef = useRef<HTMLDivElement | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const configuredBackendUrl = useMemo(
    () => normalizeBackendUrl(getStoredBackendUrl() ?? ""),
    []
  );
  const [backendState, setBackendState] = useState<"checking" | "online" | "offline" | "missing">(
    configuredBackendUrl ? "checking" : "missing"
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [marqueeDistance, setMarqueeDistance] = useState(0);
  const marqueeItems = useMemo(() => [...FOOTER_ITEMS, ...FOOTER_ITEMS, ...FOOTER_ITEMS], []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    const attemptPlay = () => {
      void video.play().catch(() => {});
    };

    const handleReady = () => {
      setVideoReady(true);
      attemptPlay();
    };

    const handleError = () => {
      setVideoReady(false);
    };

    video.muted = true;
    video.playsInline = true;
    video.defaultMuted = true;

    video.addEventListener("canplay", handleReady);
    video.addEventListener("error", handleError);

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(LOGIN_VIDEO_SRC);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, handleReady);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) handleError();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = LOGIN_VIDEO_SRC;
      video.addEventListener("loadedmetadata", handleReady);
    }

    return () => {
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadedmetadata", handleReady);
      hls?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!configuredBackendUrl) return;

    let cancelled = false;

    const checkBackend = async () => {
      const result = await probeBackend(configuredBackendUrl);
      if (cancelled) return;
      setBackendState(result.ok ? "online" : "offline");
    };

    void checkBackend();

    return () => {
      cancelled = true;
    };
  }, [configuredBackendUrl]);

  useEffect(() => {
    const track = marqueeTrackRef.current;
    if (!track) return;

    const updateDistance = () => setMarqueeDistance(track.scrollWidth);
    updateDistance();

    const observer = new ResizeObserver(updateDistance);
    observer.observe(track);
    window.addEventListener("resize", updateDistance);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDistance);
    };
  }, [marqueeItems]);

  const clock = useMemo(() => {
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return { hours, minutes, seconds };
  }, [now]);

  const statusLabel =
    backendState === "online"
      ? "Online"
      : backendState === "offline" || backendState === "missing"
        ? "Offline"
        : "Linking";

  const marqueeStyle = useMemo(
    () =>
      ({
        "--login-marquee-distance": `${marqueeDistance}px`,
        "--login-marquee-distance-negative": `-${marqueeDistance}px`,
        "--login-marquee-duration": `${Math.max(marqueeDistance / 80, 18)}s`,
      }) as CSSProperties,
    [marqueeDistance]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!configuredBackendUrl) {
      setError("Backend API is not configured for this deployment.");
      return;
    }

    if (!username.trim()) {
      setError("Enter your username first.");
      return;
    }

    if (!password) {
      setError("Enter your password first.");
      return;
    }

    setSubmitting(true);
    setError("");

    const result = await login(username, password);
    setSubmitting(false);

    if (result.success) {
      navigate("/dashboard", { replace: true });
      return;
    }

    setError(result.error ?? "Login failed. Check your username, password, and backend API.");
  };

  return (
    <div className="login-page">
      <div className="login-page__mesh" aria-hidden="true">
        <video
          ref={videoRef}
          className={`login-page__video ${videoReady ? "login-page__video--ready" : ""}`}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="login-page__video-overlay" />
        <div className="login-page__noise" />
        <div className="login-page__grid" />
        <div className="login-page__glow login-page__glow--one" />
        <div className="login-page__glow login-page__glow--two" />
      </div>

      <header className="login-topbar">
        <div className="login-topbar__brand">
          <Radio size={18} />
          <div>
            <h1>IRIS</h1>
            <span>System Status: {statusLabel}</span>
          </div>
        </div>
        <div className="login-topbar__clock" aria-label="Current time">
          <span className="login-topbar__digit login-topbar__digit--one">{clock.hours}</span>
          <span className="login-topbar__sep">:</span>
          <span className="login-topbar__digit login-topbar__digit--two">{clock.minutes}</span>
          <span className="login-topbar__sep">:</span>
          <span className="login-topbar__digit login-topbar__digit--three">{clock.seconds}</span>
        </div>
      </header>

      <main className="login-terminal">
        <section className="login-terminal__panel">
          <div className="login-terminal__header">
            <h2>Admin Access</h2>
            <p>
              Encrypted terminal access for <span>IRIS Core</span>. Please provide credentials.
            </p>
          </div>

          {error && <p className="login-alert login-alert--danger">{error}</p>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form__field">
              <label className="login-form__label">Terminal Identity</label>
              <div className="login-input">
                <span className="login-input__icon">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter Username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="login-input__field"
                />
              </div>
            </div>

            <div className="login-form__field">
              <label className="login-form__label">Encryption Key</label>
              <div className="login-input">
                <span className="login-input__icon">#</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter Password"
                  autoComplete="current-password"
                  className="login-input__field"
                />
              </div>
            </div>

            <button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? "Initializing..." : "Log In"}
            </button>
          </form>
        </section>
      </main>

      <footer className="login-marquee" aria-label="System ticker">
        <div className="login-marquee__rail" style={marqueeStyle}>
          <div className="login-marquee__track" ref={marqueeTrackRef}>
            {marqueeItems.map((item, index) => (
              item.href ? (
                <a
                  key={`primary-${item.label}-${index}`}
                  className={`login-marquee__link ${item.tone === "strong" ? "login-marquee__item--strong" : "login-marquee__item--muted"}`}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  key={"primary-" + item.label + "-" + index}
                  className={item.tone === "strong" ? "login-marquee__item--strong" : "login-marquee__item--muted"}
                >
                  {item.label}
                </span>
              )
            ))}
          </div>
          <div className="login-marquee__track" aria-hidden="true">
            {marqueeItems.map((item, index) => (
              item.href ? (
                <a
                  key={`clone-${item.label}-${index}`}
                  className={`login-marquee__link ${item.tone === "strong" ? "login-marquee__item--strong" : "login-marquee__item--muted"}`}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  tabIndex={-1}
                >
                  {item.label}
                </a>
              ) : (
                <span
                  key={`clone-${item.label}-${index}`}
                  className={item.tone === "strong" ? "login-marquee__item--strong" : "login-marquee__item--muted"}
                >
                  {item.label}
                </span>
              )
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
