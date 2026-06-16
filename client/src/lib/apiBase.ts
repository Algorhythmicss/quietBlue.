/**
 * API base URL for backend requests.
 * - Empty string (default): same-origin — use for single Render web service.
 * - Set VITE_API_URL at build time for split deploy (e.g. https://quietblue-api.onrender.com).
 */
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;
