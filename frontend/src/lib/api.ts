const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

const ACCESS_KEY = "nexainvite_access";
const REFRESH_KEY = "nexainvite_refresh";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * Pull something human-readable out of an error body.
 *
 * The custom views use the {success, message, ...} envelope, but DRF's own
 * validation errors are bare field maps like {"phone_number": ["..."]} with no
 * `message` key — those used to fall through to a bare "Bad Request", hiding
 * the actual reason a form was rejected.
 */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim()) return body;
  if (!body || typeof body !== "object") return fallback;

  const record = body as Record<string, unknown>;
  if (typeof record.message === "string" && record.message) return record.message;
  if (typeof record.detail === "string" && record.detail) return record.detail;

  const messages: string[] = [];
  for (const [field, value] of Object.entries(record)) {
    const parts = Array.isArray(value) ? value : [value];
    for (const part of parts) {
      if (typeof part !== "string") continue;
      messages.push(field === "non_field_errors" ? part : `${field}: ${part}`);
    }
  }
  return messages.length ? messages.join(" ") : fallback;
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  localStorage.setItem(ACCESS_KEY, data.access);
  return data.access as string;
}

interface RequestOptions extends RequestInit {
  auth?: boolean;
  isForm?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { auth = true, isForm = false, headers, ...rest } = options;
  const url = `${API_BASE_URL}${path}`;

  const buildHeaders = (): HeadersInit => {
    const h: Record<string, string> = { ...(headers as Record<string, string>) };
    if (!isForm) h["Content-Type"] = "application/json";
    if (auth) {
      const token = getAccessToken();
      if (token) h["Authorization"] = `Bearer ${token}`;
    }
    return h;
  };

  let res = await fetch(url, { ...rest, headers: buildHeaders() });

  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(url, { ...rest, headers: buildHeaders() });
    }
  }

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, res.statusText || "Request failed"),
      res.status,
      body
    );
  }

  return body as T;
}

/**
 * Fetch a file response (not JSON) and hand it to the browser as a download.
 * Used by the invite-links CSV export and the PDF downloads, which return a real
 * file body rather than the usual {success, message, data} envelope.
 */
export async function downloadFile(
  path: string,
  fallbackFilename: string,
  options: RequestOptions = {}
): Promise<void> {
  const { auth = true, headers, ...rest } = options;
  const url = `${API_BASE_URL}${path}`;

  const buildHeaders = (): HeadersInit => {
    const h: Record<string, string> = { ...(headers as Record<string, string>) };
    if (auth) {
      const token = getAccessToken();
      if (token) h["Authorization"] = `Bearer ${token}`;
    }
    return h;
  };

  let res = await fetch(url, { ...rest, headers: buildHeaders() });
  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await fetch(url, { ...rest, headers: buildHeaders() });
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await res.json() : await res.text();
    throw new ApiError(
      extractErrorMessage(body, res.statusText || "Download failed"),
      res.status,
      body
    );
  }

  // Prefer the server's filename; CORS_EXPOSE_HEADERS makes this readable.
  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match ? match[1] : fallbackFilename;

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export const api = {
  get: <T = unknown>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, data?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, {
      ...options,
      method: "POST",
      body: options?.isForm ? (data as BodyInit) : data ? JSON.stringify(data) : undefined,
    }),
  patch: <T = unknown>(path: string, data?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T = unknown>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
