/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string
  readonly VITE_DEV_JWT?: string
  readonly VITE_VOICE_PROVIDER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
