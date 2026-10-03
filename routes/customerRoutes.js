const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Customer Landing Page
router.get('/', customerController.getRestaurantPage);

// Claim Reward Action
router.post('/claim', customerController.claimReward);

// View Issued Reward Ticket
router.get('/reward/:rewardId', customerController.getRewardTicket);

// Location-based Redemption Endpoint
router.post('/redeem', customerController.redeemReward);

// QR Code View Endpoint
router.get('/qr', customerController.getQrCode);

module.exports = router;