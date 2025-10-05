import { Line, Bar, Pie } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend)

export function LineChart({ labels = [], data = [], label = 'Value' }){
  const cfg = {
    labels,
    datasets: [{
      label,
      data,
      borderColor: '#059669',
      backgroundColor: 'rgba(5,150,105,0.12)',
      borderWidth: 3,
      pointRadius: 4,
      tension: 0.25
    }]
  }
  const opts = { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  return <div style={{ height: 240 }}><Line data={cfg} options={opts} /></div>
}

export function BarChart({ labels = [], data = [], label = 'Value' }){
  const cfg = {
    labels,
    datasets: [{ label, data, backgroundColor: '#f97316' }]
  }
  const opts = { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  return <div style={{ height: 240 }}><Bar data={cfg} options={opts} /></div>
}

export function PieChart({ labels = [], data = [] }){
  const cfg = { labels, datasets: [{ data, backgroundColor: ['#16a34a','#f59e0b','#ef4444'] }] }
  const opts = { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  return <div style={{ height: 220 }}><Pie data={cfg} options={opts} /></div>
}
