import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useForm } from 'react-hook-form'

export default function DistrictSelector(){
  const { districts, selected, setSelected } = useApp()
  const { register, watch } = useForm({ defaultValues: { q: '' } })
  const q = watch('q') || ''
  const filtered = useMemo(() => districts.filter(d => d.name.toLowerCase().includes(q.toLowerCase())), [districts, q])

  return (
    <div>
      <div className="mb-2">
        <input {...register('q')} placeholder="Search district (MP)" className="w-full p-2 rounded-md bg-white/5" />
      </div>

      <select className="w-full p-2 rounded-md bg-white/5" value={selected?.id || ''} onChange={e => {
        const id = e.target.value
        const found = districts.find(d => d.id === id)
        if (found) setSelected(found)
      }}>
        <option value="">-- Select district --</option>
        {filtered.map(d => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
    </div>
  )
}
