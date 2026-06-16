/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin for split deploy. Leave unset for same-origin (single Render service). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
