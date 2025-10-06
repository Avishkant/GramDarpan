// Read Vite env vars. Prefer VITE_API_BASE but fall back to VITE_BACKEND_URL if needed.
// Resolve API base in order: Vite env (VITE_API_BASE or VITE_BACKEND_URL),
// then runtime fallback to window origin + port 6000 (dev convenience).
// This fallback is intentionally permissive for local development only.
const viteApiBase = import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL || ''
// If no VITE_API_BASE is configured, prefer a relative path (empty string).
// This ensures dev servers use the Vite proxy (`/api` -> backend) instead of the browser
// attempting to contact an unsafe port directly (e.g. 6000 which some browsers block).
export const API_BASE = viteApiBase || ''

// Client URL (useful for building absolute links in the frontend). Falls back to window.origin.
export const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || (typeof window !== 'undefined' ? window.location.origin : '')

async function request(path, opts = {}) {
  // ensure path maps to backend API prefix if not absolute
  if (!path.startsWith('http') && !path.startsWith('/api')) {
    path = '/api/' + path.replace(/^\//, '')
  }
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let body = text
    try { body = text ? JSON.parse(text) : text } catch (e) { /* keep raw text */ }
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return res.json()
}

const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) })
}

export default api
