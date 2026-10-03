const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Customer landing page
router.get('/', customerController.getRestaurantPage);

// API endpoint to claim a reward
router.post('/claim', customerController.claimReward);

// View active reward ticket
router.get('/reward/:rewardId', customerController.getRewardPage);

// Permanent QR Code endpoint
router.get('/qr', customerController.getPermanentQRCode);

module.exports = router;