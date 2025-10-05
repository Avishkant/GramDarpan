import { useApp } from '../context/AppContext'
import { formatNumber } from '../utils/format'

export default function KPICard({ icon, labelEn, labelHi, value, hint }){
  // Large, touch-friendly KPI card with bilingual label and optional hint
  const { showHindiDigits } = useApp() || { showHindiDigits: false }
  const useHindi = !!showHindiDigits
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl shadow-lg flex flex-col items-start gap-2 border border-slate-700">
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1">
          <div className="text-lg font-semibold text-white">{labelEn}</div>
          {labelHi && <div className="text-sm text-slate-300">{labelHi}</div>}
        </div>
        {icon && <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">{icon}</div>}
      </div>
  <div className="mt-2 text-5xl font-extrabold text-white leading-tight">{typeof value === 'number' ? formatNumber(value, useHindi) : (value ?? '-')}</div>
      {hint && <div className="mt-1 text-sm text-slate-300">{hint}</div>}
    </div>
  )
}
