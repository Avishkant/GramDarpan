import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const AppContext = createContext(null)

export function AppProvider({ children }){
  const [districts, setDistricts] = useState([])
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)
  const [showHindiDigits, setShowHindiDigits] = useState(false)

  function notify(message, type = 'info', ms = 4000){
    setToast({ message, type })
    if (ms) setTimeout(() => setToast(null), ms)
  }

  // expose for simple calls from components that don't use context directly
  try { window.__gramdarpan_notify = notify } catch(e){}

  useEffect(() => {
    api.get('/districts').then(setDistricts).catch(() => setDistricts([]))
  }, [])

  // on load, try HTML5 geolocation and reverse lookup
  useEffect(() => {
    const stored = localStorage.getItem('selectedDistrict')
    if (stored) {
      try { setSelected(JSON.parse(stored)) } catch(e){}
    }
    const hd = localStorage.getItem('showHindiDigits')
    if (hd === '1') setShowHindiDigits(true)
    if (!navigator.geolocation) return
    // request permission and location
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = pos.coords.latitude; const lon = pos.coords.longitude
      console.log('geolocated', { lat, lon })
      try {
        // wait until districts loaded
        let tries = 0
        while (tries < 10 && districts.length === 0) { await new Promise(r => setTimeout(r, 200)); tries++ }
        const res = await api.post('/geo/reverse', { lat, lon })
        console.log('geo reverse response', res)
        if (res && res.ok && res.district) {
          // ensure selected matches existing district id
          const match = districts.find(d => d.id === res.district.id) || districts.find(d => d.name.toLowerCase() === (res.district.name||'').toLowerCase())
          if (match) {
            setSelected(match)
            notify(`Detected district: ${match.name}`, 'success')
          }
          else {
            setSelected(res.district)
            notify(`Detected district: ${res.district.name}`, 'success')
          }
        }
      } catch (err) {
        console.error('geo reverse error', err)
      }
    }, err => {
      console.log('geolocation failed', err)
    }, { timeout: 8000 })
  }, [])

  useEffect(() => {
    if (selected) localStorage.setItem('selectedDistrict', JSON.stringify(selected))
  }, [selected])

  useEffect(() => {
    localStorage.setItem('showHindiDigits', showHindiDigits ? '1' : '0')
  }, [showHindiDigits])

  function toggleHindiDigits() { setShowHindiDigits(s => !s) }

  return (
    <AppContext.Provider value={{ districts, selected, setSelected, notify, toast, showHindiDigits, toggleHindiDigits }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(){
  return useContext(AppContext)
}

export default AppContext
