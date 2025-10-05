const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const districts = await db.collection('districts').find({ state: 'MP' }).toArray();
    res.json(districts.map(d => ({ id: d.id, name: d.name })));
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

module.exports = router;
