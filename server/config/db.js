const mongoose = require('mongoose');
const { mongoUri } = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(mongoUri);
    console.log(`[db] connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
