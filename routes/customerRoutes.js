const express = require('express');

const router =
  express.Router();

const customerController =
  require('../controllers/customerController');

router.get(
  '/',
  customerController.getRestaurantPage
);

router.post(
  '/claim',
  customerController.claimReward
);

router.get(
  '/reward/:rewardId',
  customerController.getRewardTicket
);

router.post(
  '/submit-upi',
  customerController.submitUpiForPayout
);

router.post(
  '/redeem',
  customerController.redeemReward
);

router.get(
  '/qr',
  customerController.getQrCode
);

module.exports = router;