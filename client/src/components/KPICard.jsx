export default function KPICard({ icon, label, value, color = 'text-white' }){
  return (
    <div className="bg-white/3 p-4 rounded-lg">
      <div className="text-sm text-slate-400">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value ?? '-'}</div>
    </div>
  )
}
