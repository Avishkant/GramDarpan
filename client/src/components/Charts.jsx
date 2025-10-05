import { Line, Bar, Pie } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend)

export function LineChart({ labels = [], data = [], label = 'Value' }){
  const cfg = { labels, datasets: [{ label, data, borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.08)' }] }
  return <Line data={cfg} />
}

export function BarChart({ labels = [], data = [], label = 'Value' }){
  const cfg = { labels, datasets: [{ label, data, backgroundColor: '#7c3aed' }] }
  return <Bar data={cfg} />
}

export function PieChart({ labels = [], data = [] }){
  const cfg = { labels, datasets: [{ data, backgroundColor: ['#16a34a','#f59e0b','#ef4444'] }] }
  return <Pie data={cfg} />
}
