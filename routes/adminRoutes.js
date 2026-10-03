const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Render Admin Dashboard
router.get('/', adminController.getDashboard);

// Update Settings Endpoint
router.post('/settings', adminController.updateSettings);

module.exports = router;