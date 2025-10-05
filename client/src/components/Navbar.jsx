import { Link } from 'react-router-dom'

export default function Navbar(){
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
      </div>
    </nav>
  )
}
