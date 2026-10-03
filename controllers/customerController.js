const QRCode = require('qrcode');
const Settings = require('../models/Settings');
const deviceService = require('../services/deviceService');
const rewardService = require('../services/rewardService');

/**
 * Render Customer Restaurant Page
 */
const getRestaurantPage = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    const deviceId = req.deviceId;
    const eligibility = await deviceService.checkDeviceEligibility(deviceId);

    res.render('customer/restaurant', {
      settings,
      deviceId,
      canClaim: eligibility.canClaim,
      eligibilityMessage: eligibility.message
    });
  } catch (error) {
    console.error('Customer Page Error:', error);
    res.status(500).send('Server Error loading restaurant page');
  }
};

/**
 * Handle Claim Reward API Call (POST)
 */
const claimReward = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const effectiveDeviceId = deviceId || req.deviceId;

    const result = await rewardService.createRewardForDevice(effectiveDeviceId);
    return res.json(result);
  } catch (error) {
    console.error('Claim Reward Error:', error);
    return res.status(500).json({ success: false, message: 'Server error claiming reward.' });
  }
};

/**
 * Render Active Customer Reward Page
 */
const getRewardPage = async (req, res) => {
  try {
    const { rewardId } = req.params;
    const reward = await rewardService.getRewardById(rewardId);

    if (!reward) {
      return res.status(404).send('Reward not found.');
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    res.render('customer/reward', {
      reward,
      settings
    });
  } catch (error) {
    console.error('View Reward Error:', error);
    res.status(500).send('Server Error loading reward');
  }
};

/**
 * Generate & Download Permanent Restaurant QR Code Image
 */
const getPermanentQRCode = async (req, res) => {
  try {
    const fullUrl = `${req.protocol}://${req.get('host')}/restaurant`;
    const qrDataUrl = await QRCode.toDataURL(fullUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });

    res.send(`
      <div style="text-align: center; font-family: sans-serif; padding: 40px;">
        <h2>Permanent Restaurant QR Code</h2>
        <p>Scans direct to: <code>${fullUrl}</code></p>
        <img src="${qrDataUrl}" alt="Restaurant QR Code" style="border: 1px solid #ccc; padding: 10px; border-radius: 8px;" />
        <br/><br/>
        <a href="${qrDataUrl}" download="restaurant-qr.png" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Download QR PNG</a>
      </div>
    `);
  } catch (error) {
    console.error('QR Generation Error:', error);
    res.status(500).send('Failed to generate QR code');
  }
};

module.exports = {
  getRestaurantPage,
  claimReward,
  getRewardPage,
  getPermanentQRCode
};