const { MongoClient } = require('mongodb');
const config = require('../config');

let client;
let db;

async function connect() {
  if (db) {
    console.log('MongoDB already connected');
    return db;
  }

  console.log('Connecting to MongoDB...');
  try {
    client = new MongoClient(config.MONGO_URL, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      connectTimeoutMS: 5000
    });
    await client.connect();
    db = client.db(config.DB_NAME);
    console.log('MongoDB connected successfully');
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    console.error('\nPlease ensure:');
    console.error('1. MongoDB is running');
    console.error('2. MONGO_URL in .env is correct');
    console.error(`3. Current MONGO_URL: ${config.MONGO_URL}\n`);
    throw error;
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call connect() first.');
  }
  return db;
}

async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

module.exports = {
  connect,
  getDb,
  close
};
