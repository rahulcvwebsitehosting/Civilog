/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ADMIN_PASSWORD: string
  readonly VITE_COORDINATOR_PASSWORD: string
  readonly VITE_HOD_PASSWORD: string
}
