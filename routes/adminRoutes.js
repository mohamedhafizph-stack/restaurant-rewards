const express = require('express');

const router = express.Router();

const adminController =
  require('../controllers/adminController');

const uploadAd =
  require('../middleware/uploadAd');


router.get(
  '/',
  adminController.getDashboard
);


router.post(
  '/settings',
  adminController.updateSettings
);


router.post(
  '/ads',
  uploadAd.single('image'),
  adminController.createAd
);


router.post(
  '/ads/:id/toggle',
  adminController.toggleAd
);


router.post(
  '/ads/:id/delete',
  adminController.deleteAd
);


router.post(
  '/payouts/mark-paid',
  adminController.markPayoutAsPaid
);


module.exports = router;