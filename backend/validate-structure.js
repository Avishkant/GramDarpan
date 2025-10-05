#!/usr/bin/env node
/**
 * Simple structure validation script
 * Tests that all modules can be loaded without runtime errors
 */

console.log('🔍 Validating backend structure...\n');

const tests = [];

// Test 1: Config module
try {
  const config = require('./src/config');
  tests.push({ name: 'Config module', status: '✅', details: `PORT: ${config.PORT}` });
} catch (err) {
  tests.push({ name: 'Config module', status: '❌', details: err.message });
}

// Test 2: DB module exports
try {
  const db = require('./src/db');
  const hasConnect = typeof db.connect === 'function';
  const hasGetDb = typeof db.getDb === 'function';
  const hasClose = typeof db.close === 'function';
  
  if (hasConnect && hasGetDb && hasClose) {
    tests.push({ name: 'DB module', status: '✅', details: 'All exports present' });
  } else {
    tests.push({ name: 'DB module', status: '⚠️', details: 'Missing exports' });
  }
} catch (err) {
  tests.push({ name: 'DB module', status: '❌', details: err.message });
}

// Test 3-7: Route modules
const routes = ['health', 'districts', 'metrics', 'admin', 'geo'];
for (const route of routes) {
  try {
    const router = require(`./src/routes/${route}`);
    tests.push({ name: `Route: ${route}`, status: '✅', details: 'Loaded successfully' });
  } catch (err) {
    tests.push({ name: `Route: ${route}`, status: '❌', details: err.message });
  }
}

// Test 8: ETL module
try {
  const etl = require('./src/etl/fetch_mgnrega');
  const hasFetchAndStore = typeof etl.fetchAndStore === 'function';
  if (hasFetchAndStore) {
    tests.push({ name: 'ETL module', status: '✅', details: 'fetchAndStore export found' });
  } else {
    tests.push({ name: 'ETL module', status: '⚠️', details: 'fetchAndStore export missing' });
  }
} catch (err) {
  tests.push({ name: 'ETL module', status: '❌', details: err.message });
}

// Print results
console.log('Validation Results:');
console.log('===================\n');

let passed = 0;
let failed = 0;
let warnings = 0;

tests.forEach(test => {
  console.log(`${test.status} ${test.name}`);
  console.log(`   ${test.details}\n`);
  
  if (test.status === '✅') passed++;
  else if (test.status === '❌') failed++;
  else warnings++;
});

console.log('===================');
console.log(`Summary: ${passed} passed, ${failed} failed, ${warnings} warnings\n`);

if (failed > 0) {
  console.log('❌ Structure validation failed!');
  process.exit(1);
} else if (warnings > 0) {
  console.log('⚠️  Structure validation passed with warnings');
  process.exit(0);
} else {
  console.log('✅ Structure validation passed!');
  console.log('\nNext steps:');
  console.log('1. Ensure MongoDB is running');
  console.log('2. Configure .env file');
  console.log('3. Run: npm start');
  console.log('4. Test API with Postman (see POSTMAN_TESTING.md)');
  process.exit(0);
}
