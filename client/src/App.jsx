import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [districts, setDistricts] = useState([])
  const [coords, setCoords] = useState(null)
  const [locStatus, setLocStatus] = useState('idle')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/districts').then(r => r.json()).then(setDistricts).catch(() => {
      setDistricts([{ id: 'indore', name: 'Indore' }, { id: 'bhopal', name: 'Bhopal' }, { id: 'gwalior', name: 'Gwalior' }])
    })
  }, [])

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocStatus('unsupported')
      return
    }
    setLocStatus('asking')
    navigator.geolocation.getCurrentPosition(pos => {
      setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy })
      setLocStatus('success')
    }, err => {
      setLocStatus('error')
    }, { enableHighAccuracy: true, timeout: 10000 })
  }

  return (
    <div>
      <h1>GramDarpan — MGNREGA (MP)</h1>

      <section style={{margin: '1rem 0'}}>
        <button onClick={detectLocation} style={{padding:'12px 18px',fontSize:16}}>Detect my location / मेरा स्थान खोजें</button>
        {locStatus === 'asking' && <div style={{marginTop:8}}>Requesting location...</div>}
        {locStatus === 'unsupported' && <div style={{marginTop:8,color:'red'}}>Geolocation not supported in your browser</div>}
        {locStatus === 'error' && <div style={{marginTop:8,color:'red'}}>Unable to get location (permission denied or timeout)</div>}
        {locStatus === 'success' && coords && (
          <div style={{marginTop:8}}>
            <div>Detected: Lat {coords.lat.toFixed(5)}, Lon {coords.lon.toFixed(5)} (±{Math.round(coords.accuracy)}m)</div>
            <div style={{marginTop:8}}>Please confirm your district from the list below.</div>
          </div>
        )}
      </section>

      <section style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
        {districts.map(d => (
          <button key={d.id} onClick={() => setSelected(d)} style={{padding:16,fontSize:16,borderRadius:8}}>
            {d.name}
          </button>
        ))}
      </section>

      {selected && (
        <section style={{marginTop:20}}>
          <h2>Selected: {selected.name}</h2>
          <div>Load metrics for this district next (not implemented yet)</div>
        </section>
      )}
    </div>
  )
}

export default App
