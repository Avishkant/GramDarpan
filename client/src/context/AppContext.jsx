import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const AppContext = createContext(null)

export function AppProvider({ children }){
  const [districts, setDistricts] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/districts').then(setDistricts).catch(() => setDistricts([]))
  }, [])

  // on load, try HTML5 geolocation and reverse lookup
  useEffect(() => {
    const stored = localStorage.getItem('selectedDistrict')
    if (stored) {
      try { setSelected(JSON.parse(stored)) } catch(e){}
    }
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
          if (match) setSelected(match)
          else setSelected(res.district)
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

  return (
    <AppContext.Provider value={{ districts, selected, setSelected }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(){
  return useContext(AppContext)
}

export default AppContext
