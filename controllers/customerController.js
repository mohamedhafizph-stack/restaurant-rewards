const Settings = require('../models/Settings');
const Reward = require('../models/Reward');
const Device = require('../models/Device');
const rewardService = require('../services/rewardService');
const QRCode = require('qrcode');

/**
 * Customer Landing Page
 */
const getRestaurantPage = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    const deviceId = req.deviceId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const device = await Device.findOne({ deviceId });
    const hasScratchedToday = !!(device && device.lastScratchedAt && new Date(device.lastScratchedAt) >= today);

    const existingReward = await Reward.findOne({
      deviceId,
      createdAt: { $gte: today }
    });

    res.render('customer/restaurant', {
      settings,
      deviceId,
      hasScratchedToday,
      existingReward
    });
  } catch (error) {
    console.error('Error in getRestaurantPage:', error);
    res.status(500).send('Server Error');
  }
};

/**
 * Claim Reward Action (Handles Random Scratch & 1 Attempt/Day Limit)
 */
const claimReward = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || req.deviceId;
    const result = await rewardService.getOrCreateRewardForDevice(deviceId);

    if (result.alreadyPlayed) {
      return res.json({
        alreadyPlayed: true,
        isWinner: result.isWinner,
        message: result.message,
        redirectUrl: result.reward ? `/restaurant/reward/${result.reward.rewardId}` : null
      });
    }

    if (result.isWinner) {
      return res.json({
        alreadyPlayed: false,
        isWinner: true,
        redirectUrl: `/restaurant/reward/${result.reward.rewardId}`
      });
    } else {
      return res.json({
        alreadyPlayed: false,
        isWinner: false,
        message: 'Better luck next time!'
      });
    }
  } catch (error) {
    console.error('Error in claimReward:', error);
    return res.status(500).json({ success: false, message: 'Server error processing game outcome.' });
  }
};

/**
 * Reward Ticket View
 */
const getRewardTicket = async (req, res) => {
  try {
    const { rewardId } = req.params;
    const reward = await Reward.findOne({ rewardId });

    if (!reward) {
      return res.status(404).send('Reward ticket not found');
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
    console.error('Error in getRewardTicket:', error);
    res.status(500).send('Server Error rendering reward ticket');
  }
};

/**
 * Redeem Reward POST Endpoint
 */
const redeemReward = async (req, res) => {
  try {
    const { rewardId, latitude, longitude } = req.body;

    if (!rewardId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing reward ID or location coordinates.'
      });
    }

    const result = await rewardService.redeemRewardWithLocation(rewardId, latitude, longitude);
    return res.json(result);
  } catch (error) {
    console.error('Redeem Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing redemption.'
    });
  }
};

/**
 * Permanent Restaurant QR Code Route
 */
const getQrCode = async (req, res) => {
  try {
    const protocol = req.protocol;
    const host = req.get('host');
    const restaurantUrl = `${protocol}://${host}/restaurant`;

    const qrDataUrl = await QRCode.toDataURL(restaurantUrl, {
      width: 400,
      margin: 2
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Restaurant QR Code</title>
        <style>
          body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f4f6f8; margin: 0; }
          .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; }
          img { margin: 20px 0; }
          p { color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Scan to Claim Your Reward!</h2>
          <img src="${qrDataUrl}" alt="Restaurant QR Code" />
          <p>Target URL: <a href="${restaurantUrl}">${restaurantUrl}</a></p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).send('Error generating QR code');
  }
};

module.exports = {
  getRestaurantPage,
  claimReward,
  getRewardTicket,
  redeemReward,
  getQrCode
};