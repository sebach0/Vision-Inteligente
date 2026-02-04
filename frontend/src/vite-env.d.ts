/// <reference types="vite/client" />

// (opcional) tipa tus variables específicas:
interface ImportMetaEnv {
  readonly VITE_API_URL: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
