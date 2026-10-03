const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

// 1. Load environment variables FIRST
dotenv.config();

// 2. Import database connection
const connectDB = require('./config/db');

// 3. Import routes
const customerRoutes = require('./routes/customerRoutes');

// 4. Connect to MongoDB Atlas
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Device Identification Middleware
// Reads device ID from custom header/query or generates a fallback session identifier
app.use((req, res, next) => {
  let deviceId = req.headers['x-device-id'] || req.query.deviceId;
  
  if (!deviceId) {
    // Basic fallback device identifier generated server-side for local testing
    deviceId = 'dev_' + crypto.randomBytes(6).toString('hex');
  }
  
  req.deviceId = deviceId;
  next();
});

// Route Mounts
app.use('/restaurant', customerRoutes);

// Root redirect to restaurant customer page
app.get('/', (req, res) => {
  res.redirect('/restaurant');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Adoraise server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});