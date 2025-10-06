import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const AppContext = createContext(null)

export function AppProvider({ children }){
  const [districts, setDistricts] = useState([])
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)
  const [showHindiDigits, setShowHindiDigits] = useState(false)
  const [autoDetectAttempted, setAutoDetectAttempted] = useState(false)

  function notify(message, type = 'info', ms = 4000){
    setToast({ message, type })
    if (ms) setTimeout(() => setToast(null), ms)
  }

  // expose for simple calls from components that don't use context directly
  try { window.__gramdarpan_notify = notify } catch(e){}

  useEffect(() => {
    api.get('/districts').then(setDistricts).catch(() => setDistricts([]))
  }, [])

  // on load, restore selection and preferences
  useEffect(() => {
    const stored = localStorage.getItem('selectedDistrict')
    if (stored) {
      try { setSelected(JSON.parse(stored)) } catch(e){}
    }
    const hd = localStorage.getItem('showHindiDigits')
    if (hd === '1') setShowHindiDigits(true)
  }, [])

  // Robust auto-detect function: try HTML5 geolocation -> reverse -> IP fallback via /geo/auto
  async function autoDetect() {
    try {
      notify('Attempting to detect district using your device location...', 'info', 4000)
      // Ensure districts are loaded
      let tries = 0
      while (tries < 50 && districts.length === 0) { await new Promise(r => setTimeout(r, 200)); tries++ }

      // Try HTML5 geolocation first
      if (navigator.geolocation) {
        // Check permission status if available
        try {
          if (navigator.permissions && navigator.permissions.query) {
            const p = await navigator.permissions.query({ name: 'geolocation' })
            if (p.state === 'denied') {
              notify('Location permission denied in browser. Please enable location for this site or use Auto-detect button.', 'error', 8000)
            }
          }
        } catch (permErr) {
          console.warn('permission query failed', permErr)
        }

        let pos = null
        try {
          pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 15000 })
          })
        } catch (gErr) {
          console.warn('geolocation.getCurrentPosition failed', gErr)
          // show user-friendly message
          if (gErr && gErr.code === 1) {
            notify('Location permission was denied. Please enable it in browser settings or use Auto-detect (IP) instead.', 'error', 8000)
          } else if (gErr && gErr.code === 3) {
            notify('Location timed out. Try again or use Auto-detect (IP).', 'error', 6000)
          }
        }

        if (pos) {
          const lat = pos.coords.latitude; const lon = pos.coords.longitude
          try {
            const res = await api.post('/geo/reverse', { lat, lon })
            // explicit not-in-mp response from server
            if (res && res.in_mp === false) {
              notify('You appear to be outside Madhya Pradesh. The app only shows MP districts.', 'warn', 8000)
              return null
            }
            if (res && res.ok && res.district) {
              const match = districts.find(d => d.id === res.district.id || String(d._id) === String(res.district.id)) || districts.find(d => d.name.toLowerCase() === (res.district.name||'').toLowerCase())
              if (match) {
                setSelected(match)
                notify(`Detected district: ${match.name}`, 'success')
                try { localStorage.setItem('lastAutoDetectAt', String(Date.now())) } catch(e){}
                return match
              } else {
                setSelected(res.district)
                notify(`Detected district: ${res.district.name}`, 'success')
                try { localStorage.setItem('lastAutoDetectAt', String(Date.now())) } catch(e){}
                return res.district
              }
            }
            // Try to match candidate names returned by the server against our district list
            if (res && Array.isArray(res.candidates) && res.candidates.length) {
              const normalize = s => String(s||'').toLowerCase().replace(/\b(district|zilla|zila)\b/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim()
              const normMap = new Map(districts.map(d => [normalize(d.name), d]))
              for (const c of res.candidates) {
                const n = normalize(c)
                if (normMap.has(n)) {
                  const match = normMap.get(n)
                  setSelected(match)
                  notify(`Detected district: ${match.name}`, 'success')
                  try { localStorage.setItem('lastAutoDetectAt', String(Date.now())) } catch(e){}
                  return match
                }
              }
              // try includes matching
              for (const c of res.candidates) {
                const n = normalize(c)
                const match = districts.find(d => normalize(d.name).includes(n) || n.includes(normalize(d.name)))
                if (match) {
                  setSelected(match)
                  notify(`Detected district: ${match.name}`, 'success')
                  try { localStorage.setItem('lastAutoDetectAt', String(Date.now())) } catch(e){}
                  return match
                }
              }
              notify('Could not confidently map your precise location to a district; please pick from the list.', 'info', 7000)
            }
          } catch (err) { console.error('reverse error', err); notify('Location lookup failed. Try Auto-detect (IP) or pick a district manually.', 'error', 7000) }
        }
      }

      // Fallback to IP-based auto lookup
      try {
        const auto = await api.get('/geo/auto')
        if (auto && auto.in_mp === false) {
          notify('Your IP location shows you are outside Madhya Pradesh. The app only supports MP districts.', 'warn', 8000)
          return null
        }
        if (auto && auto.ok && auto.district) {
          const match = districts.find(d => d.id === auto.district.id || String(d._id) === String(auto.district.id)) || districts.find(d => d.name.toLowerCase() === (auto.district.name||'').toLowerCase())
          if (match) {
            setSelected(match)
            notify(`Detected district: ${match.name}`, 'success')
            try { localStorage.setItem('lastAutoDetectAt', String(Date.now())) } catch(e){}
            return match
          } else {
            setSelected(auto.district)
            notify(`Detected district: ${auto.district.name}`, 'success')
            try { localStorage.setItem('lastAutoDetectAt', String(Date.now())) } catch(e){}
            return auto.district
          }
        }
        if (auto && Array.isArray(auto.candidates) && auto.candidates.length) {
          const normalize = s => String(s||'').toLowerCase().replace(/\b(district|zilla|zila)\b/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim()
          const normMap = new Map(districts.map(d => [normalize(d.name), d]))
          for (const c of auto.candidates) {
            const n = normalize(c)
            if (normMap.has(n)) {
              const match = normMap.get(n)
              setSelected(match)
              notify(`Detected district: ${match.name}`, 'success')
              try { localStorage.setItem('lastAutoDetectAt', String(Date.now())) } catch(e){}
              return match
            }
          }
        }
      } catch (err) { console.error('ip auto error', err) }

      notify('Could not detect district automatically. Please select from the list.', 'info', 6000)
      return null
    } catch (err) {
      console.error('autoDetect error', err)
      notify('Auto-detection failed', 'error')
      return null
    }
  }

  // Automatically attempt autoDetect once after districts load when there's no selected district
  useEffect(() => {
    if (autoDetectAttempted) return
    if (districts && districts.length > 0) {
      // cooldown: don't prompt more than once per 24h unless user clicks Auto-detect
      try {
        const last = Number(localStorage.getItem('lastAutoDetectAt') || '0') || 0
        const now = Date.now()
        const oneDay = 24 * 60 * 60 * 1000
        if (last && (now - last) < oneDay) {
          setAutoDetectAttempted(true)
          notify('Auto-detect skipped: tried recently. Tap "Auto-detect" to retry.', 'info', 6000)
          return
        }
      } catch (e) {}
      // try auto-detect but don't spam permission prompt: it will prompt once
      setAutoDetectAttempted(true)
      autoDetect().catch(() => {})
    }
  }, [districts, selected, autoDetectAttempted])

  useEffect(() => {
    if (selected) localStorage.setItem('selectedDistrict', JSON.stringify(selected))
  }, [selected])

  useEffect(() => {
    localStorage.setItem('showHindiDigits', showHindiDigits ? '1' : '0')
  }, [showHindiDigits])

  function toggleHindiDigits() { setShowHindiDigits(s => !s) }

  return (
    <AppContext.Provider value={{ districts, selected, setSelected, notify, toast, showHindiDigits, toggleHindiDigits, autoDetect }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(){
  return useContext(AppContext)
}

export default AppContext
