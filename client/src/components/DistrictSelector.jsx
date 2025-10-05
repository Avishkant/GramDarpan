import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

export default function DistrictSelector(){
  const { districts, selected, setSelected } = useApp()
  const { register, watch } = useForm({ defaultValues: { q: '' } })
  const q = watch('q') || ''
  const filtered = useMemo(() => districts.filter(d => d.name.toLowerCase().includes(q.toLowerCase())), [districts, q])

  return (
    <div>
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-300">Choose district <span className="text-slate-400">/ जिला चुनें</span></div>
            <div className="text-lg font-semibold">Select your district</div>
          </div>
          <div className="text-sm text-slate-400">{filtered.length} found</div>
        </div>
        <div className="mt-2">
          <input {...register('q')} placeholder="Search district (e.g. Bhopal) — जिला ढूंढें" aria-label="Search district" className="w-full p-3 rounded-lg bg-slate-800 text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        </div>
      </div>

      <div className="mt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-auto">
          {filtered.map(d => {
            const isSelected = selected?.id === d.id
            return (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className={`text-left p-3 rounded-md transition focus:outline-none ${isSelected ? 'ring-2 ring-cyan-400 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-lg">{d.name}</div>
                  {isSelected && <div className="text-sm text-slate-100">Selected</div>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <ConfirmButton selected={selected} setSelected={setSelected} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSelected(null)} className="px-4 py-3 rounded-md bg-rose-500 text-white font-medium">Clear</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmButton({ selected, setSelected }){
  const navigate = useNavigate()
  const onConfirm = () => {
    if (!selected) return
    setSelected(selected)
    try { window.__gramdarpan_notify && window.__gramdarpan_notify(`Selected ${selected.name}`) } catch(e){}
    navigate('/trends')
  }
  return (
    <button onClick={onConfirm} disabled={!selected} className={`w-full px-4 py-3 rounded-md font-semibold ${selected ? 'bg-cyan-500 text-slate-900' : 'bg-white/6 text-slate-400 cursor-not-allowed'}`}>
      {selected ? `Confirm — ${selected.name}` : 'Confirm (choose a district)'}
    </button>
  )
}
