const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

// 1. Load environment variables FIRST
dotenv.config();

// 2. Import database connection module
const connectDB = require('./config/db');

// 3. Connect to MongoDB Atlas
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (CSS, client JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Test Root Route
app.get('/', (req, res) => {
  res.send('<h1>Adoraise Single-Restaurant Reward System — Server Active</h1>');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Adoraise server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});