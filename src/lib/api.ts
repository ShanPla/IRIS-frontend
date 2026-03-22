import axios from "axios";

const STORAGE_KEY = "iris_access_token";
const BACKEND_URL_KEY = "iris_backend_url";
const DEFAULT_PI_BACKEND_PORT = "8000";
const envApiUrl = import.meta.env.VITE_API_URL as string | undefined;
export const DEFAULT_PI_HINT = extractPiAddress(envApiUrl?.trim() ?? "");

function isLikelyPiHost(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  // Private-network IPv4 ranges are typical for local Pi deployments.
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  return false;
}

export function normalizeBackendUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname) return "";
    const hasExplicitPort = Boolean(parsed.port);
    const shouldDefaultToPiPort = !hasExplicitPort && parsed.protocol === "http:" && isLikelyPiHost(parsed.hostname);
    const port = hasExplicitPort ? parsed.port : shouldDefaultToPiPort ? DEFAULT_PI_BACKEND_PORT : "";
    return `${parsed.protocol}//${parsed.hostname}${port ? `:${port}` : ""}`;
  } catch {
    return "";
  }
}

export function getStoredBackendUrl(): string | null {
  const fromStorage = localStorage.getItem(BACKEND_URL_KEY);
  if (fromStorage) {
    const normalized = normalizeBackendUrl(fromStorage);
    return normalized || null;
  }
  if (envApiUrl) {
    const normalized = normalizeBackendUrl(envApiUrl);
    return normalized || null;
  }
  return null;
}

export function getStoredPiAddress(): string | null {
  const backendUrl = getStoredBackendUrl();
  if (!backendUrl) return null;
  return extractPiAddress(backendUrl);
}

export function hasBackendUrlConfigured(): boolean {
  return Boolean(getStoredBackendUrl());
}

export function setStoredBackendUrl(url: string | null) {
  if (!url) {
    localStorage.removeItem(BACKEND_URL_KEY);
    delete apiClient.defaults.baseURL;
    return;
  }
  const normalized = normalizeBackendUrl(url);
  if (!normalized) {
    localStorage.removeItem(BACKEND_URL_KEY);
    delete apiClient.defaults.baseURL;
    return;
  }
  localStorage.setItem(BACKEND_URL_KEY, normalized);
  apiClient.defaults.baseURL = normalized;
}

export const apiClient = axios.create({
  baseURL: getStoredBackendUrl() ?? undefined,
  timeout: 15000,
});

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  setAuthHeader(token);
}

export function setAuthHeader(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete apiClient.defaults.headers.common.Authorization;
}

export function buildApiUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getStoredBackendUrl();
  if (!base) return path;
  // Append token as query param for image endpoints
  const token = getStoredToken();
  const sep = path.includes("?") ? "&" : "?";
  return `${base}${path}${token ? `${sep}token=${token}` : ""}`;
}

export interface BackendProbeResult {
  ok: boolean;
  normalizedUrl: string;
  message: string;
}

// ── Fixed: probe only /health, not /health/camera ─────────────────────────
// /health/camera requires camera_ready which is false on Windows dev.
// Admin should be able to connect to any reachable backend.
export async function probeBackend(url: string): Promise<BackendProbeResult> {
  const normalizedUrl = normalizeBackendUrl(url);
  if (!normalizedUrl) {
    return { ok: false, normalizedUrl: "", message: "Invalid Raspberry Pi IP address" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${normalizedUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, normalizedUrl, message: "Backend is unreachable" };
    }

    const data = await response.json() as { status?: string };
    if (data.status !== "ok") {
      return { ok: false, normalizedUrl, message: "Backend health check failed" };
    }

    return { ok: true, normalizedUrl, message: "Backend is reachable" };
  } catch {
    return { ok: false, normalizedUrl, message: "Cannot connect to that IP address" };
  } finally {
    clearTimeout(timeout);
  }
}

// Keep old name as alias for backward compat
export const probeBackendCamera = probeBackend;

function extractPiAddress(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname) return "";
    if (parsed.port) return `${parsed.hostname}:${parsed.port}`;
    if (parsed.protocol === "http:" && isLikelyPiHost(parsed.hostname)) {
      return `${parsed.hostname}:${DEFAULT_PI_BACKEND_PORT}`;
    }
    return parsed.hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  }
}
