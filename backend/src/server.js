require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set in backend/.env');
    await connectDB(process.env.MONGODB_URI);
    const server = http.createServer(app);
    require('./socket').initializeSocket(server);
    server.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Startup failed:', err.message);
    process.exit(1);
  }
})();
