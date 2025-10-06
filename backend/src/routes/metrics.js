const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/:id/metrics', async (req, res) => {
  try {
    const id = req.params.id;
    const db = getDb();
    
    // Fetch monthly records for this district
    const rows = await db.collection('district_monthly').find({ district_id: id }).toArray();
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'not found' });
    }

    // Build timeseries sorted by month (lexicographic sort is OK if months are yyyy-mm)
    const timeseries = rows
      .map(r => ({ month: r.month, beneficiaries: r.beneficiaries || 0, days_worked: r.days_worked || 0 }))
      .sort((a, b) => (a.month > b.month ? 1 : a.month < b.month ? -1 : 0));

    // Compute simple state percentile: rank of latest beneficiaries among all districts
    const latestMonth = timeseries[timeseries.length - 1].month;
    const latestBeneficiaries = timeseries[timeseries.length - 1].beneficiaries;

    // Get latest beneficiaries for all districts at the same month
    const pipeline = [
      { $match: { month: latestMonth } },
      { $group: { _id: '$district_id', beneficiaries: { $first: '$beneficiaries' } } },
      { $sort: { beneficiaries: -1 } }
    ];
    const allLatest = await db.collection('district_monthly').aggregate(pipeline).toArray();
    const rank = allLatest.findIndex(d => d._id === id) + 1;
    const percentile = allLatest.length ? Math.round(((allLatest.length - rank) / allLatest.length) * 100) : 0;

    res.json({
      district_id: id,
      name: rows[0].name,
      timeseries,
      comparison: {
        state_percentile: percentile,
        latest_month: latestMonth,
        latest_beneficiaries: latestBeneficiaries
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

module.exports = router;
