const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', async (req, res) => {
  const db = getDb();
  const districts = await db.collection('districts').find({ state: 'MP' }).toArray();
  res.json(districts.map(d => ({ id: d.id, name: d.name })));
});

module.exports = router;
