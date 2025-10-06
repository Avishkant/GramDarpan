import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { API_BASE } from '../api'

export default function DistrictSelector(){
  const { districts, selected, setSelected, districtDiagnostics } = useApp()
  const { autoDetect } = useApp()
  const [dbg, setDbg] = useState({ perm: null, pos: null, err: null })
  const { register, watch } = useForm({ defaultValues: { q: '' } })
  const q = watch('q') || ''
  const filtered = useMemo(() => districts.filter(d => d.name.toLowerCase().includes(q.toLowerCase())), [districts, q])

  return (
    <div>
      {districts.length === 0 && (
        <div className="mb-3 p-3 rounded border border-rose-600 bg-rose-900/20">
          <div className="font-semibold text-white">No districts loaded</div>
          <div className="text-sm text-slate-300">API_BASE: <span className="text-white">{API_BASE || '(empty)'}</span></div>
          <details className="mt-2 text-xs text-slate-300" open={Boolean(districtDiagnostics)}>
            <summary>{districtDiagnostics ? (districtDiagnostics.success ? 'Load succeeded — details' : 'Load failed — details') : 'Show debug data'}</summary>
            <pre className="text-xs mt-2 bg-slate-800 p-2 rounded text-white">{JSON.stringify(districts, null, 2)}</pre>
            {districtDiagnostics && (
              <div className="mt-2 text-xs text-slate-300">
                <div>Diagnostics: {districtDiagnostics.success ? 'success' : 'failure'}</div>
                {Array.isArray(districtDiagnostics.attempts) && (
                  <div className="mt-1">
                    <div className="font-semibold text-white">Attempts</div>
                    <ul className="text-xs list-disc pl-5 mt-1 text-slate-300">
                      {districtDiagnostics.attempts.map((a, i) => (
                        <li key={i}>
                          <div><span className="text-white">{a.url}</span> — {a.status ? `status ${a.status}` : `error ${a.error}`}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <pre className="mt-2 bg-slate-800 p-2 rounded text-white">{JSON.stringify(districtDiagnostics, null, 2)}</pre>
              </div>
            )}
          </details>
        </div>
      )}
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

      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => autoDetect()} className="px-4 py-2 rounded-md bg-cyan-500 text-slate-900 font-semibold">Auto-detect district</button>
        <div className="text-sm text-slate-400">if location permission allowed, we will try to detect your district</div>
      </div>

      {/* Debug panel to diagnose geolocation/permission issues */}
      <div className="mb-3 border-t pt-3">
        <details>
          <summary className="text-sm text-slate-300">Debug: location permission & test</summary>
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex gap-2">
              <button onClick={async () => {
                // query permission
                try {
                  const p = navigator.permissions ? await navigator.permissions.query({ name: 'geolocation' }) : null
                  setDbg(d => ({ ...d, perm: p ? p.state : 'unsupported' }))
                } catch (e) { setDbg(d => ({ ...d, perm: 'error' })) }
              }} className="px-3 py-2 bg-slate-700 rounded text-white">Check permission state</button>

              <button onClick={async () => {
                try {
                  await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(pos => resolve(pos), err => reject(err), { timeout: 15000 })
                  }).then(p => setDbg(d => ({ ...d, pos: { lat: p.coords.latitude, lon: p.coords.longitude }, err: null }))).catch(e => setDbg(d => ({ ...d, err: e, pos: null })))
                } catch (e) { setDbg(d => ({ ...d, err: e })) }
              }} className="px-3 py-2 bg-slate-700 rounded text-white">Run getCurrentPosition</button>
            </div>
            <div className="text-sm text-slate-400">Permission: <span className="text-white">{String(dbg.perm)}</span></div>
            <div className="text-sm text-slate-400">Position: <span className="text-white">{dbg.pos ? `${dbg.pos.lat}, ${dbg.pos.lon}` : '-'}</span></div>
            <div className="text-sm text-rose-400">Error: <span className="text-white">{dbg.err ? (dbg.err.message || JSON.stringify(dbg.err)) : '-'}</span></div>
            <div className="text-xs text-slate-300">If permission shows 'denied', open Chrome site settings → Location → Allow or Reset permissions, then retry.</div>
          </div>
        </details>
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
