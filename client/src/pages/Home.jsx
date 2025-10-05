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
          <KPICard labelEn="Total job cards" labelHi="कुल जॉब कार्ड" value={metrics?.timeseries?.reduce((s,t)=>s+(t.beneficiaries||0),0)} hint="समय के साथ जोड़ें" />
          <KPICard labelEn="Workers (latest)" labelHi="कर्मचारी (नवीनतम)" value={metrics?.comparison?.latest_beneficiaries} hint="हालिया माह" />
          <KPICard labelEn="Wage (est.)" labelHi="वेतन (अनुमान)" value={metrics?.comparison?.latest_beneficiaries ? '₹' + ((metrics.comparison.latest_beneficiaries || 0) * 100).toLocaleString() : '-'} hint="एक मोटा अनुमान" />
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-850 p-6 rounded-xl shadow-md border border-slate-700">
          <h3 className="font-bold mb-2 text-2xl text-white">Select district — जिला चुनें</h3>
          <p className="text-slate-300 mb-4">Tap your district from the list below. अगर आप अपने जिले को नहीं ढूँढ पा रहे हैं, तो ऑटो-डिटेक्ट बटन दबाएँ।</p>
          <DistrictSelector />
        </div>
      </div>
    )
}
