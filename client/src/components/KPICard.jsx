export default function KPICard({ icon, labelEn, labelHi, value, hint }){
  // Large, touch-friendly KPI card with bilingual label and optional hint
  return (
    <div className="bg-white/5 p-5 rounded-2xl shadow-md flex flex-col items-start gap-2">
      <div className="text-lg font-semibold text-slate-100">{labelEn}</div>
      {labelHi && <div className="text-sm text-slate-300">{labelHi}</div>}
      <div className="mt-2 text-4xl font-extrabold text-white leading-tight">{value ?? '-'}</div>
      {hint && <div className="mt-1 text-xs text-slate-300">{hint}</div>}
    </div>
  )
}
