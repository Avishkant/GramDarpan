// Simple scheduler to run periodic ETL and precompute jobs
// Controlled by env vars:
// SCHEDULE_CRON_ENABLED (default: '1' to enable)
// ETL_CRON (cron expression for ETL script) default '0 2 * * *' (daily at 02:00)
// PRECOMPLETE_CRON (cron expression for precompute) default '0 3 * * *' (daily at 03:00)

const config = require('../config')
const { spawn } = require('child_process')

function startScheduler() {
  const enabled = process.env.SCHEDULE_CRON_ENABLED !== '0'
  if (!enabled) {
    console.log('Scheduler disabled by SCHEDULE_CRON_ENABLED=0')
    return
  }

  let cron
  try {
    cron = require('node-cron')
  } catch (e) {
    console.warn('node-cron not installed; scheduler disabled')
    return
  }

  const etlCron = process.env.ETL_CRON || '0 2 * * *'
  const precomputeCron = process.env.PRECOMPUTE_CRON || '0 3 * * *'

  cron.schedule(etlCron, () => {
    console.log('Scheduler: starting ETL job')
    const script = require('path').join(__dirname, '..', '..', 'src', 'etl', 'fetch_mgnrega.js')
    const child = spawn(process.execPath, [script], { detached: true, stdio: 'ignore' })
    child.unref()
  })

  cron.schedule(precomputeCron, () => {
    console.log('Scheduler: starting precompute job')
    const script = require('path').join(__dirname, '..', '..', 'scripts', 'precompute_reports.js')
    const child = spawn(process.execPath, [script], { detached: true, stdio: 'ignore' })
    child.unref()
  })

  console.log(`Scheduler started. ETL: ${etlCron}, Precompute: ${precomputeCron}`)
}

module.exports = { startScheduler }
