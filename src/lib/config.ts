export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'

// Temporary stopgap: paste a JWT from cuidarte-ia-backend's existing /api/auth login flow
// into .env.local as VITE_DEV_JWT. Replace with a real login screen before shipping.
export const DEV_JWT = import.meta.env.VITE_DEV_JWT ?? ''
