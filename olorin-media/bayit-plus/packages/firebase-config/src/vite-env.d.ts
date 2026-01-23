/// <reference types="vite/client" />

/**
 * Extend ImportMeta to include Vite-specific env property
 */
interface ImportMetaEnv {
  [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
