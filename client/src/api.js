const base = import.meta.env.VITE_API_BASE || ''

async function request(path, opts = {}) {
  // ensure path maps to backend API prefix if not absolute
  if (!path.startsWith('http') && !path.startsWith('/api')) {
    path = '/api/' + path.replace(/^\//, '')
  }
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export default {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) })
}
