const { MongoClient } = require('mongodb');
const { MONGO_URL, DB_NAME } = require('../config');

let client;
let db;

async function connect() {
  if (db) return db;
  client = new MongoClient(MONGO_URL);
  await client.connect();
  db = client.db(DB_NAME);
  return db;
}

function getDb() {
  if (!db) throw new Error('DB not connected yet. Call connect() first.');
  return db;
}

module.exports = { connect, getDb, clientRef: () => client };
