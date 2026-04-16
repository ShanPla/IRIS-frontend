import axios from "axios";

const STORAGE_KEY = "iris_access_token";
const BACKEND_URL_KEY = "iris_backend_api_url";
const PI_ADDRESS_KEY = "iris_pi_address";
const LEGACY_MIXED_URL_KEY = "iris_backend_url";
const DEFAULT_PI_BACKEND_PORT = "8000";
export const DEFAULT_API_TIMEOUT_MS = 15000;
export const AUTH_API_TIMEOUT_MS = 45000;
const ENV_API_URL = normalizeBackendUrl(
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ""
);

function isLikelyPiHost(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
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
    const shouldDefaultToPiPort =
      !hasExplicitPort && parsed.protocol === "http:" && isLikelyPiHost(parsed.hostname);
    const port = hasExplicitPort ? parsed.port : shouldDefaultToPiPort ? DEFAULT_PI_BACKEND_PORT : "";
    return `${parsed.protocol}//${parsed.hostname}${port ? `:${port}` : ""}`;
  } catch {
    return "";
  }
}

export function normalizePiAddress(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname) return "";
    const port = parsed.port || (isLikelyPiHost(parsed.hostname) ? DEFAULT_PI_BACKEND_PORT : "");
    return port ? `${parsed.hostname}:${port}` : parsed.hostname;
  } catch {
    return "";
  }
}

function migrateLegacyStorage() {
  const legacy = localStorage.getItem(LEGACY_MIXED_URL_KEY);
  if (!legacy) return;

  const normalized = normalizeBackendUrl(legacy);
  localStorage.removeItem(LEGACY_MIXED_URL_KEY);
  if (!normalized) return;

  try {
    const parsed = new URL(normalized);
    if (isLikelyPiHost(parsed.hostname)) {
      if (!localStorage.getItem(PI_ADDRESS_KEY)) {
        localStorage.setItem(PI_ADDRESS_KEY, normalizePiAddress(normalized));
      }
      return;
    }
    if (!localStorage.getItem(BACKEND_URL_KEY)) {
      localStorage.setItem(BACKEND_URL_KEY, normalized);
    }
  } catch {
    // Ignore malformed legacy values.
  }
}

export function getStoredBackendUrl(): string | null {
  migrateLegacyStorage();
  const fromStorage = localStorage.getItem(BACKEND_URL_KEY);
  if (fromStorage) {
    const normalized = normalizeBackendUrl(fromStorage);
    return normalized || null;
  }
  return ENV_API_URL || null;
}

export function hasBackendUrlConfigured(): boolean {
  return Boolean(getStoredBackendUrl());
}

export function setStoredBackendUrl(url: string | null) {
  if (!url) {
    localStorage.removeItem(BACKEND_URL_KEY);
    if (ENV_API_URL) {
      apiClient.defaults.baseURL = ENV_API_URL;
    } else {
      delete apiClient.defaults.baseURL;
    }
    return;
  }
  const normalized = normalizeBackendUrl(url);
  if (!normalized) {
    localStorage.removeItem(BACKEND_URL_KEY);
    if (ENV_API_URL) {
      apiClient.defaults.baseURL = ENV_API_URL;
    } else {
      delete apiClient.defaults.baseURL;
    }
    return;
  }
  localStorage.setItem(BACKEND_URL_KEY, normalized);
  apiClient.defaults.baseURL = normalized;
}

export function getStoredPiAddress(): string | null {
  migrateLegacyStorage();
  const fromStorage = localStorage.getItem(PI_ADDRESS_KEY);
  if (!fromStorage) return null;
  const normalized = normalizePiAddress(fromStorage);
  return normalized || null;
}

export function hasPiBackendConfigured(): boolean {
  return Boolean(getStoredPiAddress());
}

export function setStoredPiAddress(address: string | null) {
  if (!address) {
    localStorage.removeItem(PI_ADDRESS_KEY);
    return;
  }
  const normalized = normalizePiAddress(address);
  if (!normalized) {
    localStorage.removeItem(PI_ADDRESS_KEY);
    return;
  }
  localStorage.setItem(PI_ADDRESS_KEY, normalized);
}

export const apiClient = axios.create({
  baseURL: getStoredBackendUrl() ?? undefined,
  timeout: DEFAULT_API_TIMEOUT_MS,
});

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (
      detail &&
      typeof detail === "object" &&
      "detail" in detail &&
      typeof detail.detail === "string" &&
      detail.detail.trim()
    ) {
      return detail.detail;
    }
    if (error.code === "ECONNABORTED") {
      return "Backend request timed out. Check if the API server is online.";
    }
    if (error.code === "ERR_NETWORK") {
      return "Cannot reach the backend API. Check the backend URL and server status.";
    }
    if (error.message?.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function logApiError(scope: string, error: unknown) {
  // Keep the full error in the browser console for debugging without exposing it in the UI.
  console.error(scope, error);
}

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

  // Normalize DB snapshot paths (e.g. "data/snapshots/file.jpg") to API paths
  let apiPath = path;
  if (apiPath.startsWith("data/snapshots/")) {
    const filename = apiPath.split("/").pop();
    apiPath = `/api/snapshots/${filename}`;
  } else if (!apiPath.startsWith("/")) {
    apiPath = `/${apiPath}`;
  }

  // Snapshots are served from the Pi — prefer Pi address over cloud backend
  const piAddress = getStoredPiAddress();
  let base: string | undefined;
  if (piAddress?.trim()) {
    const raw = piAddress.trim();
    base = /^https?:\/\//i.test(raw) ? raw.replace(/\/+$/, "") : `http://${raw}`;
  }
  if (!base) base = getStoredBackendUrl() ?? undefined;
  if (!base) return apiPath;

  const token = getStoredToken();
  const sep = apiPath.includes("?") ? "&" : "?";
  return `${base}${apiPath}${token ? `${sep}token=${token}` : ""}`;
}

export interface BackendProbeResult {
  ok: boolean;
  normalizedUrl: string;
  message: string;
}

export async function probeBackend(url: string): Promise<BackendProbeResult> {
  const normalizedUrl = normalizeBackendUrl(url);
  if (!normalizedUrl) {
    return { ok: false, normalizedUrl: "", message: "Invalid backend URL" };
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

    const data = (await response.json()) as { status?: string };
    if (data.status !== "ok") {
      return { ok: false, normalizedUrl, message: "Backend health check failed" };
    }

    return { ok: true, normalizedUrl, message: "Backend is reachable" };
  } catch {
    return { ok: false, normalizedUrl, message: "Cannot connect to backend URL" };
  } finally {
    clearTimeout(timeout);
  }
}

export const probeBackendCamera = probeBackend;
