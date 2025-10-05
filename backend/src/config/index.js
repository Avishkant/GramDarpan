const required = ['MONGO_URL','DB_NAME','PORT','DATA_GOV_BASE','DATA_GOV_API_KEY','ADMIN_TOKEN'];
require('dotenv').config();

for (const k of required) {
  if (!process.env[k]) {
    console.warn(`env ${k} not set`);
  }
}

module.exports = {
  MONGO_URL: process.env.MONGO_URL,
  DB_NAME: process.env.DB_NAME || 'GramDarpan',
  PORT: process.env.PORT || 5000,
  DATA_GOV_BASE: process.env.DATA_GOV_BASE,
  DATA_GOV_API_KEY: process.env.DATA_GOV_API_KEY,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN,
  BACKEND_URL: process.env.BACKEND_URL,
  CLIENT_URL: process.env.CLIENT_URL,
  NOMINATIM_USER_AGENT: process.env.NOMINATIM_USER_AGENT
};
