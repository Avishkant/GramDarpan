import { useEffect, useState } from 'react'
import './App.css'
import api from './api'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Trends from './pages/Trends'
import About from './pages/About'
import { Routes, Route } from 'react-router-dom'
import { useApp } from './context/AppContext'
import Toast from './components/Toast'

function Sparkline({ data = [], width = 200, height = 40, color = '#0ea5e9' }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / (max - min || 1)) * height
    return `${x},${y}`
  }).join(' ')
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
  </svg>
}

function DistrictCard({ d, onSelect }) {
  return (
    <button onClick={() => onSelect(d)} className="bg-white/5 hover:bg-white/6 border border-white/5 rounded-lg p-4 text-left transition transform hover:-translate-y-0.5">
      <div className="font-semibold text-lg text-slate-100">{d.name}</div>
    </button>
  )
}

function App() {
  const [districts, setDistricts] = useState([])
  const [selected, setSelected] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [locStatus, setLocStatus] = useState('idle')

  useEffect(() => {
    api.get('/districts').then(setDistricts).catch(() => {
      setDistricts([{ id: 'indore', name: 'Indore' }, { id: 'bhopal', name: 'Bhopal' }])
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    api.get(`/${selected.id}/metrics`).then(data => {
      setMetrics(data)
    }).catch(err => {
      setMetrics(null)
    }).finally(() => setLoading(false))
  }, [selected])

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocStatus('unsupported')
      return
    }
    setLocStatus('asking')
    navigator.geolocation.getCurrentPosition(pos => {
      setLocStatus('success')
      // we keep privacy: client-only detection. Optionally you may call /api/geo/auto
    }, err => {
      setLocStatus('error')
    }, { enableHighAccuracy: true, timeout: 10000 })
  }

  const { toast } = useApp()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100">
      <Navbar />
      <div className="container mx-auto px-4 py-6 flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
      <Toast toast={toast} />
    </div>
  )
}

export default App
