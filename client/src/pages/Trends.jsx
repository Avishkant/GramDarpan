import { useApp } from '../context/AppContext'
import { useEffect, useState } from 'react'
import api from '../api'
import { LineChart, BarChart } from '../components/Charts'

export default function Trends(){
  const { selected } = useApp()
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    if (!selected) return
    api.get(`/${selected.id}/metrics`).then(setMetrics).catch(()=>setMetrics(null))
  }, [selected])

  const labels = metrics?.timeseries?.map(t=>t.month) || []
  const data = metrics?.timeseries?.map(t=>t.beneficiaries) || []

  return (
    <div className="space-y-4">
      <div className="bg-white/3 p-4 rounded-lg">
        <h3 className="font-semibold">Yearly performance</h3>
        <LineChart labels={labels} data={data} label="Beneficiaries" />
      </div>

      <div className="bg-white/3 p-4 rounded-lg">
        <h3 className="font-semibold">Comparison</h3>
        <BarChart labels={labels} data={data} label="District vs State" />
      </div>
    </div>
  )
}
