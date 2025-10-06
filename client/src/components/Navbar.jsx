import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const loc = useLocation()

  const NavLink = ({ to, children, variant = 'dark' }) => {
    const active = loc.pathname === to
    const base = 'block px-4 py-2 rounded-md text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2'
    if (variant === 'dark') {
      return (
        <Link
          to={to}
          onClick={() => setOpen(false)}
          className={`${base} ${active ? 'bg-cyan-600 text-slate-900' : 'text-slate-100 hover:bg-slate-800/60'} focus:ring-cyan-400`}
          aria-current={active ? 'page' : undefined}
        >
          {children}
        </Link>
      )
    }
    // light variant (used on mobile dark panels)
    return (
      <Link
        to={to}
        onClick={() => setOpen(false)}
        className={`${base} ${active ? 'bg-cyan-600 text-slate-900' : 'text-slate-100 hover:bg-slate-800/60'}`}
        aria-current={active ? 'page' : undefined}
      >
        {children}
      </Link>
    )
  }

  return (
  <header className="bg-gradient-to-r from-slate-900 to-slate-950 text-slate-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-slate-900 font-bold text-lg">G</div>
            <div>
              <div className="text-lg font-semibold text-white">GramDarpan</div>
              <div className="text-xs text-indigo-100">Know your district · Know your rights</div>
            </div>
          </div>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-3">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/trends">Trends</NavLink>
            <NavLink to="/about">About</NavLink>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setOpen(o => !o)}
              aria-controls="mobile-menu"
              aria-expanded={open}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="sr-only">Open main menu</span>
              {!open ? (
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel (white for readability) */}
      {open && (
        <div id="mobile-menu" className="md:hidden bg-slate-900 border-t border-slate-800">
          <div className="px-4 pt-3 pb-4 space-y-1">
            <NavLink to="/" variant="light">Home</NavLink>
            <NavLink to="/trends" variant="light">Trends</NavLink>
            <NavLink to="/about" variant="light">About</NavLink>
          </div>
        </div>
      )}
    </header>
  )
}
