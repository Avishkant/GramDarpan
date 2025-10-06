export default function Toast({ toast }){
  if (!toast) return null
  const bg = toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-rose-500' : 'bg-slate-700'
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed right-4 top-16 z-50 max-w-xs w-auto p-3 rounded-md text-white ${bg} shadow-lg pointer-events-auto`}
    >
      {toast.message}
    </div>
  )
}
