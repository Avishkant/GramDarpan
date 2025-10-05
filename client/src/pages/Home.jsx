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
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard labelEn="Total people helped" labelHi="कुल लाभार्थी" value={metrics ? (metrics.timeseries?.reduce((s,t)=>s+(t.beneficiaries||0),0) || 0).toLocaleString() : '-'} hint="समय के साथ योग" />
          <KPICard labelEn="Latest month people" labelHi="नवीनतम माह के लोग" value={metrics ? (metrics.comparison?.latest_beneficiaries || 0).toLocaleString() : '-'} hint="सबसे हाल का महीना" />
          <KPICard labelEn="Wage (est.)" labelHi="वेतन (अनुमान)" value={metrics ? (metrics.comparison?.latest_beneficiaries ? '₹' + ((metrics.comparison.latest_beneficiaries || 0) * 100).toLocaleString() : '-') : '-'} hint="मोटा अनुमान" />
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-850 p-6 rounded-xl shadow-md border border-slate-700">
          <h3 className="font-bold mb-2 text-2xl text-white">Select district — जिला चुनें</h3>
          <p className="text-slate-300 mb-4">Tap your district from the list below. अगर आप अपने जिले को नहीं ढूँढ पा रहे हैं, तो ऑटो-डिटेक्ट बटन दबाएँ।</p>
          <DistrictSelector />
        </div>

        <div className="bg-white/5 p-4 rounded-xl shadow-sm border">
          <h4 className="text-lg font-semibold">How is my district doing? — मेरा जिला कैसा कर रहा है?</h4>
          <p className="text-sm text-slate-500">Quick view: latest month people, yearly total, and an easy colored status.</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="p-4 bg-green-600 text-white rounded-lg">
              <div className="text-sm">Status</div>
              <div className="text-2xl font-bold">{metrics ? (metrics.comparison?.latest_beneficiaries > 50000 ? 'Good' : (metrics.comparison?.latest_beneficiaries > 20000 ? 'Okay' : 'Poor')) : '-'}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Latest month</div>
              <div className="text-xl font-bold">{metrics?.comparison?.latest_month || '-'}</div>
              <div className="text-lg">{metrics?.comparison?.latest_beneficiaries?.toLocaleString() ?? '-' } people</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Year total</div>
              <div className="text-xl font-bold">{metrics ? (metrics.timeseries?.reduce((s,t)=>s+(t.beneficiaries||0),0) || 0).toLocaleString() : '-'}</div>
            </div>
          </div>
        </div>
      </div>
    )
}
