import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
} from "react";
import { useNavigate } from "react-router-dom";
import { Radio } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getStoredBackendUrl,
  normalizeBackendUrl,
  probeBackend,
} from "../../lib/api";
import "./Login.css";
import { Button } from "../../components/ui/neon-button";
import earthLightReturnVideo from "../../assets/Earth_LightReturn - Trim.mp4";

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
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [marqueeDistance, setMarqueeDistance] = useState(0);

  const configuredBackendUrl = useMemo(
    () => normalizeBackendUrl(getStoredBackendUrl() ?? ""),
    []
  );

  const [backendState, setBackendState] = useState<
    "checking" | "online" | "offline" | "missing"
  >(configuredBackendUrl ? "checking" : "missing");

  const marqueeItems = useMemo(
    () => [...FOOTER_ITEMS, ...FOOTER_ITEMS, ...FOOTER_ITEMS],
    []
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleReady = () => setVideoReady(true);
    const handleError = () => setVideoReady(false);

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.loop = true;
    video.src = earthLightReturnVideo;

    video.addEventListener("canplay", handleReady);
    video.addEventListener("error", handleError);

    void video.play().catch(() => undefined);

    return () => {
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    if (!configuredBackendUrl) return;

    let isMounted = true;

    const checkBackend = async () => {
      const result = await probeBackend(configuredBackendUrl);

      if (isMounted) {
        setBackendState(result.ok ? "online" : "offline");
      }
    };

    checkBackend();

    return () => {
      isMounted = false;
    };
  }, [configuredBackendUrl]);

  useEffect(() => {
    const track = marqueeTrackRef.current;
    if (!track) return;

    const updateDistance = () => setMarqueeDistance(track.scrollWidth);
    updateDistance();

    const observer = new ResizeObserver(updateDistance);
    observer.observe(track);

    return () => observer.disconnect();
  }, [marqueeItems]);

  const clock = useMemo(
    () => ({
      hours: String(now.getHours()).padStart(2, "0"),
      minutes: String(now.getMinutes()).padStart(2, "0"),
      seconds: String(now.getSeconds()).padStart(2, "0"),
    }),
    [now]
  );

  const statusLabel = useMemo(() => {
    if (backendState === "online") return "Online";
    if (backendState === "offline" || backendState === "missing") return "Offline";
    return "Linking";
  }, [backendState]);

  const marqueeStyle = useMemo(
    () =>
      ({
        "--login-marquee-distance": `${marqueeDistance}px`,
        "--login-marquee-distance-negative": `-${marqueeDistance}px`,
        "--login-marquee-duration": `${Math.max(marqueeDistance / 80, 18)}s`,
      } as CSSProperties),
    [marqueeDistance]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!configuredBackendUrl) {
        setError("Backend API is not configured.");
        return;
      }

      if (!username.trim() || !password) {
        setError("Please provide both credentials.");
        return;
      }

      setSubmitting(true);
      setError("");

      const result = await login(username, password);

      setSubmitting(false);

      if (result.success) {
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.error ?? "Login failed. Please verify credentials.");
      }
    },
    [configuredBackendUrl, username, password, login, navigate]
  );

  return (
    <div className="login-page">
      <div className="login-page__mesh" aria-hidden="true">
        <video
          ref={videoRef}
          className={`login-page__video ${
            videoReady ? "login-page__video--ready" : ""
          }`}
          autoPlay
          muted
          loop
          playsInline
        />

        <div className="login-page__blue-aura" />
        <div className="login-page__starfield" />

        <div className="login-page__shooting-stars">
          <span className="login-page__shooting-star login-page__shooting-star--three" />
          <span className="login-page__shooting-star login-page__shooting-star--four" />
        </div>

        <div className="login-page__video-overlay" />
        <div className="login-page__noise" />
        <div className="login-page__grid" />
      </div>

      <header className="login-topbar">
        <div className="login-topbar__brand">
          <Radio size={18} />
          <div>
            <h1>IRIS</h1>
            <span>System Status: {statusLabel}</span>
          </div>
        </div>

        <div className="login-topbar__clock">
          <span className="login-topbar__digit login-topbar__digit--one">
            {clock.hours}
          </span>
          <span className="login-topbar__sep">:</span>
          <span className="login-topbar__digit login-topbar__digit--two">
            {clock.minutes}
          </span>
          <span className="login-topbar__sep">:</span>
          <span className="login-topbar__digit login-topbar__digit--three">
            {clock.seconds}
          </span>
        </div>
      </header>

      <main className="login-terminal">
        <section className="login-terminal__panel glass-monolith">
          <div className="login-terminal__header">
            <h2>Admin Access</h2>
            <p>
              Encrypted terminal access for <span>IRIS Core</span>.
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
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter Username"
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
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="login-input__field"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="login-submit"
              disabled={submitting}
              variant="solid"
            >
              {submitting ? "Initializing..." : "Log In"}
            </Button>
          </form>
        </section>
      </main>

      <footer className="login-marquee">
        <div className="login-marquee__rail" style={marqueeStyle}>
          <div className="login-marquee__track" ref={marqueeTrackRef}>
            {marqueeItems.map((item, index) =>
              item.href ? (
                <a
                  key={index}
                  className={`login-marquee__link ${
                    item.tone === "strong"
                      ? "login-marquee__item--strong"
                      : "login-marquee__item--muted"
                  }`}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  key={index}
                  className={
                    item.tone === "strong"
                      ? "login-marquee__item--strong"
                      : "login-marquee__item--muted"
                  }
                >
                  {item.label}
                </span>
              )
            )}
          </div>

          <div className="login-marquee__track" aria-hidden="true">
            {marqueeItems.map((item, index) => (
              <span
                key={index}
                className={
                  item.tone === "strong"
                    ? "login-marquee__item--strong"
                    : "login-marquee__item--muted"
                }
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}