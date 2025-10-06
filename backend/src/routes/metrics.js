const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/:id/metrics', async (req, res) => {
  const id = req.params.id;
  const db = getDb();
  const rows = await db.collection('district_monthly').find({ district_id: id }).toArray();
  if (!rows || rows.length === 0) return res.status(404).json({ error: 'not found' });

  const timeseries = rows.map(r => ({ month: r.month, beneficiaries: r.beneficiaries || 0, days_worked: r.days_worked || 0 }))
    .sort((a, b) => (a.month > b.month ? 1 : a.month < b.month ? -1 : 0));

  const latestMonth = timeseries[timeseries.length - 1].month;
  const latestBeneficiaries = timeseries[timeseries.length - 1].beneficiaries;

  // Build deterministic list of districts with their beneficiaries for the latest month
  const pipeline = [
    { $match: { month: latestMonth } },
    { $group: { _id: '$district_id', beneficiaries: { $max: '$beneficiaries' } } },
    { $sort: { beneficiaries: -1, _id: 1 } }
  ];
  const allLatest = await db.collection('district_monthly').aggregate(pipeline).toArray();
  const rank = allLatest.findIndex(d => String(d._id) === String(id)) + 1;
  const percentile = allLatest.length ? Math.round(((allLatest.length - rank) / allLatest.length) * 100) : 0;

  res.json({ district_id: id, name: rows[0].name, timeseries, comparison: { state_percentile: percentile, latest_month: latestMonth, latest_beneficiaries: latestBeneficiaries } });
});

module.exports = router;
