import axios, { type AxiosInstance } from "axios";

const STORAGE_KEY = "iris_access_token";
const BACKEND_URL_KEY = "iris_backend_api_url";
const PI_ADDRESS_KEY = "iris_pi_address";

export const DEFAULT_API_TIMEOUT_MS = 15000;
export const AUTH_API_TIMEOUT_MS = 30000;

const ENV_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";
const NORMALIZED_ENV_API_URL = normalizeBackendUrl(ENV_API_URL);

export function normalizeBackendUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
  } catch {
    return "";
  }
}

function resolveBackendUrl(): string | undefined {
  const stored = normalizeBackendUrl(localStorage.getItem(BACKEND_URL_KEY) || "");
  return NORMALIZED_ENV_API_URL || stored || undefined;
}

/**
 * Primary API client for the Central Hub (Render).
 * Handles global data: users, roles, registry, and aggregate fleet data.
 */
export const apiClient = axios.create({
  baseURL: resolveBackendUrl(),
  timeout: DEFAULT_API_TIMEOUT_MS,
});

const initialToken = localStorage.getItem(STORAGE_KEY);
if (initialToken) {
  apiClient.defaults.headers.common.Authorization = `Bearer ${initialToken}`;
}

/**
 * Dynamic Pi client factory for routes reached through a node tunnel URL.
 */
export function createDynamicPiClient(tunnelUrl: string): AxiosInstance {
  const instance = axios.create({
    baseURL: normalizeBackendUrl(tunnelUrl),
    timeout: DEFAULT_API_TIMEOUT_MS,
  });

  const token = getStoredToken();
  if (token) {
    instance.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  return instance;
}

export function getStoredBackendUrl(): string | null {
  return resolveBackendUrl() ?? null;
}

export function setStoredBackendUrl(url: string | null) {
  if (NORMALIZED_ENV_API_URL) {
    localStorage.removeItem(BACKEND_URL_KEY);
    apiClient.defaults.baseURL = resolveBackendUrl();
    return;
  }

  const normalized = normalizeBackendUrl(url ?? "");
  if (normalized) {
    localStorage.setItem(BACKEND_URL_KEY, normalized);
  } else {
    localStorage.removeItem(BACKEND_URL_KEY);
  }

  apiClient.defaults.baseURL = resolveBackendUrl();
}

export function setStoredPiAddress(address: string | null) {
  const normalized = normalizeBackendUrl(address ?? "");
  if (normalized) {
    localStorage.setItem(PI_ADDRESS_KEY, normalized);
  } else {
    localStorage.removeItem(PI_ADDRESS_KEY);
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    
    // Handle 422 Validation Errors from FastAPI/Pydantic
    if (error.response?.status === 422 && Array.isArray(data?.detail)) {
      const messages = data.detail.map((err: { msg: string; loc: (string | number)[] }) => {
        const field = err.loc && err.loc.length > 1 ? String(err.loc[1]) : "";
        return field ? `${field}: ${err.msg}` : err.msg;
      });
      return messages.join(". ");
    }

    if (typeof data === "string" && data.trim()) return data;
    if (data?.detail && typeof data.detail === "string") return data.detail;
    
    if (error.code === "ECONNABORTED") return "Request timed out.";
    if (error.code === "ERR_NETWORK") return "Network error. Check backend or tunnel status.";
  }

  return error instanceof Error ? error.message : fallback;
}

export function logApiError(context: string, error: unknown) {
  console.error(`[IRIS] ${context}`, error);
}

export async function probeBackend(rawUrl: string): Promise<{
  ok: boolean;
  normalizedUrl: string;
  message: string;
}> {
  const normalizedUrl = normalizeBackendUrl(rawUrl);
  if (!normalizedUrl) {
    return {
      ok: false,
      normalizedUrl: "",
      message: "Backend API is not configured.",
    };
  }

  try {
    await axios.get(`${normalizedUrl}/health`, {
      timeout: AUTH_API_TIMEOUT_MS,
    });

    return {
      ok: true,
      normalizedUrl,
      message: "Backend reachable.",
    };
  } catch (error) {
    return {
      ok: false,
      normalizedUrl,
      message: getApiErrorMessage(error, "Unable to reach backend API."),
    };
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem(STORAGE_KEY);
    delete apiClient.defaults.headers.common.Authorization;
  }
}

/**
 * Builds a URL for Pi-hosted resources like snapshots or profile images.
 */
export function buildDynamicResourceUrl(tunnelUrl: string, path: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;

  const base = normalizeBackendUrl(tunnelUrl);
  if (!base) return undefined;

  let apiPath = path;
  if (apiPath.startsWith("data/snapshots/")) {
    const filename = apiPath.split("/").pop();
    apiPath = `/api/snapshots/${filename}`;
  } else if (!apiPath.startsWith("/")) {
    apiPath = `/${apiPath}`;
  }

  return `${base}${apiPath}`;
}
