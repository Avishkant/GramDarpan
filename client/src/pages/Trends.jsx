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

  // Simple summary for non-technical users
  const latest = metrics?.comparison?.latest_beneficiaries || 0
  const trendText = latest > 50000 ? 'बहुत अच्छा' : (latest > 20000 ? 'ठीक' : 'कम')

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-800 to-slate-850 p-5 rounded-xl shadow-md text-white">
        <h2 className="text-2xl font-bold">District trends — जिला के रुझान</h2>
        <p className="text-slate-300 mt-1">यहाँ दिखाया गया डेटा प्रति माह काम करने वाले लोगों का अनुमान है। बड़े नंबर अच्छे हैं।</p>
        <div className="mt-3 bg-white/5 p-3 rounded-lg inline-block">
          <div className="text-sm text-slate-300">Quick: Latest month — नवीनतम माह</div>
          <div className="text-2xl font-bold mt-1">{metrics?.comparison?.latest_month || '-'}</div>
          <div className="text-xl">{(metrics?.comparison?.latest_beneficiaries || 0).toLocaleString()} people</div>
          <div className="mt-2 px-3 py-2 rounded-full font-semibold text-white" style={{background: latest > 50000 ? '#16a34a' : latest > 20000 ? '#f59e0b' : '#ef4444'}}>{trendText}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2 bg-white/5 p-4 rounded-xl shadow-sm">
          <h3 className="font-semibold mb-2">Monthly beneficiaries — मासिक लाभार्थी</h3>
          <LineChart labels={labels} data={data} label="Beneficiaries" />
        </div>

        <div className="bg-white/5 p-4 rounded-xl flex flex-col items-start gap-3">
          <div>
            <div className="text-sm text-slate-400">Latest month — नवीनतम माह</div>
            <div className="text-3xl font-bold">{metrics?.comparison?.latest_month || '-'}</div>
            <div className="text-lg mt-1">{metrics?.comparison?.latest_beneficiaries?.toLocaleString() ?? 0} people</div>
          </div>

          <div className="w-full">
            <div className="text-sm text-slate-400">Quick takeaway — संक्षेप</div>
            <div className={`mt-2 inline-block px-3 py-2 rounded-full font-semibold ${trendText === 'High' ? 'bg-green-600 text-white' : trendText === 'Medium' ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'}`}>{trendText}</div>
          </div>

          <div className="w-full">
            <h4 className="text-sm text-slate-400 mb-1">Comparison — तुलना</h4>
            <BarChart labels={labels} data={data} label="District vs State" />
          </div>
        </div>
      </div>
    </div>
  )
}
