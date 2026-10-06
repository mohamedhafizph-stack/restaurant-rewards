const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const adminController = require('../controllers/adminController');

// Customer Routes
router.get('/restaurant', customerController.getRestaurantPage);
router.post('/restaurant/claim', customerController.claimReward);
router.get('/restaurant/reward/:rewardId', customerController.getRewardTicket);
router.post('/restaurant/submit-upi', customerController.submitUpiForPayout);
router.get('/qr', customerController.getQrCode);

// Admin Dashboard Routes
router.get('/admin/dashboard', adminController.getPayoutsDashboard);
router.get('/admin/payouts', adminController.getPayoutsDashboard);
router.post('/admin/payouts/mark-paid', adminController.markPayoutAsPaid);

module.exports = router;