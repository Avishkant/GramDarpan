import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Navbar(){
  const { showHindiDigits, toggleHindiDigits } = useApp() || {}
  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-white/3 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="text-xl font-bold">GramDarpan</div>
        <div className="text-sm text-slate-400">Know Your District, Know Your Rights</div>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm">Home</Link>
        <Link to="/trends" className="text-sm">Trends</Link>
        <Link to="/about" className="text-sm">About</Link>
        <button onClick={toggleHindiDigits} className="ml-2 text-sm bg-white/5 px-3 py-1 rounded">{showHindiDigits ? 'अंक: हिंदी' : 'Numbers: EN'}</button>
      </div>
    </nav>
  )
}
