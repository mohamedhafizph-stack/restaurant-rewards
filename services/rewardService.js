const crypto = require('crypto');
const Reward = require('../models/Reward');
const Settings = require('../models/Settings');
const deviceService = require('./deviceService');

/**
 * Generate an unpredictable, unique reward ID
 * Example: REW-9A82B3
 */
const generateUniqueRewardId = () => {
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `REW-${randomHex}`;
};

/**
 * Create a new reward for an eligible device
 */
const createRewardForDevice = async (deviceId) => {
  // 1. Check device eligibility first on the backend
  const eligibility = await deviceService.checkDeviceEligibility(deviceId);

  if (!eligibility.canClaim) {
    return {
      success: false,
      message: eligibility.message
    };
  }

  // 2. Fetch active restaurant settings
  let settings = await Settings.findOne();
  if (!settings) {
    // Initialize default settings if none exist yet
    settings = await Settings.create({});
  }

  if (!settings.rewardEnabled) {
    return {
      success: false,
      message: 'Rewards are currently paused by the restaurant.'
    };
  }

  // 3. Calculate expiration date
  const expiryHours = settings.rewardExpiryHours || 24;
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  // 4. Create the secure reward ID
  const rewardId = generateUniqueRewardId();

  // 5. Save reward in database
  const newReward = await Reward.create({
    rewardId,
    deviceId,
    rewardType: settings.rewardType,
    value: settings.rewardValue,
    status: 'ACTIVE',
    expiresAt
  });

  // 6. Record device claim date to block further claims today
  await deviceService.recordDeviceClaim(deviceId);

  return {
    success: true,
    message: 'Reward claimed successfully!',
    reward: newReward
  };
};

/**
 * Get reward by rewardId
 */
const getRewardById = async (rewardId) => {
  if (!rewardId) return null;
  return await Reward.findOne({ rewardId: rewardId.toUpperCase().trim() });
};

module.exports = {
  generateUniqueRewardId,
  createRewardForDevice,
  getRewardById
};