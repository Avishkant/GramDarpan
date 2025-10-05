export default function About(){
  return (
    <div className="space-y-4">
      <div className="bg-white/3 p-4 rounded-lg">
        <h3 className="font-semibold">What is MGNREGA</h3>
        <p className="text-sm text-slate-400">MGNREGA guarantees 100 days of wage employment per household in rural India. This site shows district-level performance using government open data.</p>
      </div>

      <div className="bg-white/3 p-4 rounded-lg">
        <h3 className="font-semibold">How data is calculated</h3>
        <p className="text-sm text-slate-400">We fetch district monthly reports from data.gov.in, normalize fields, and precompute time-series metrics.</p>
      </div>

      <div className="bg-white/3 p-4 rounded-lg">
        <h3 className="font-semibold">Tips for low-literacy users</h3>
        <ul className="list-disc ml-5 text-sm text-slate-400">
          <li>Use the big cards to find quick facts.</li>
          <li>Tap the district name to hear (TTS) — coming soon.</li>
        </ul>
      </div>
    </div>
  )
}
