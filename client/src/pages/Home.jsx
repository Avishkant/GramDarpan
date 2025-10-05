import DistrictSelector from '../components/DistrictSelector'
import { useApp } from '../context/AppContext'
import KPICard from '../components/KPICard'
import { useEffect, useState } from 'react'
import api from '../api'

export default function Home(){
  const { selected } = useApp()
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    if (!selected) return
    api.get(`/${selected.id}/metrics`).then(setMetrics).catch(()=>setMetrics(null))
  }, [selected])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard label="Total job cards" value={metrics?.timeseries?.reduce((s,t)=>s+(t.beneficiaries||0),0)} />
        <KPICard label="Total workers" value={metrics?.comparison?.latest_beneficiaries} />
        <KPICard label="Wage payments" value={'₹' + (metrics?.comparison?.latest_beneficiaries || 0) * 100} />
      </div>

      <div className="bg-white/3 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Select district</h3>
        <DistrictSelector />
      </div>
    </div>
  )
}
