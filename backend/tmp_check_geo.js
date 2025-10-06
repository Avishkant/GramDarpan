(async()=>{
  try{
    const config = require('./src/config');
    const { MongoClient } = require('mongodb');
    const mongoUrl = config.MONGO_URL || 'mongodb://localhost:27017';
    const dbName = config.DB_NAME || 'gramdarpan';
    const client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    const total = await db.collection('districts').countDocuments();
    const withGeo = await db.collection('districts').countDocuments({ geo: { $exists: true } });
    const sampleWithGeo = await db.collection('districts').find({ geo: { $exists: true } }).limit(3).toArray();
    const sampleNoGeo = await db.collection('districts').find({ $or:[{ geo: { $exists: false } }, { geo: null }] }).limit(3).toArray();
    console.log(JSON.stringify({ total, withGeo, sampleWithGeo, sampleNoGeo }, null, 2));
    await client.close();
  }catch(e){
    console.error(e);
    process.exit(1);
  }
})();
