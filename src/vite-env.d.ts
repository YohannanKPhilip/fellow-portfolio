/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHEET_ID?: string;
  readonly VITE_DEFAULT_FELLOW?: string;
  readonly VITE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
