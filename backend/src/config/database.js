const mongoose = require('mongoose');

// Connects to MongoDB. Throws on failure so server.js can exit with a clear message.
async function connectDB(uri) {
  if (!uri) throw new Error('MONGODB_URI is not set. Copy backend/.env.example to backend/.env');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
