const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', async (req, res) => {
  const db = getDb();
  // support different state value cases written by ETL
  const districts = await db.collection('districts').find({ state: { $in: ['MP','Madhya Pradesh','Madhya pradesh','Madhya Pradesh'.toUpperCase()] } }).toArray();
  // normalize name casing to Title Case for frontend
  const normalize = s => String(s).toLowerCase().split(/\s+/).map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' ')
  res.json(districts.map(d => ({ id: d.id, name: normalize(d.name) })));
});

module.exports = router;
