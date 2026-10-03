const crypto = require('crypto');
const Reward = require('../models/Reward');
const Settings = require('../models/Settings');
const deviceService = require('./deviceService');
const locationService = require('./locationService');

const generateUniqueRewardId = () => {
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `REW-${randomHex}`;
};

const createRewardForDevice = async (deviceId) => {
  const eligibility = await deviceService.checkDeviceEligibility(deviceId);

  if (!eligibility.canClaim) {
    return {
      success: false,
      message: eligibility.message
    };
  }

  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }

  if (!settings.rewardEnabled) {
    return {
      success: false,
      message: 'Rewards are currently paused by the restaurant.'
    };
  }

  const expiryHours = settings.rewardExpiryHours || 24;
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  const rewardId = generateUniqueRewardId();

  const newReward = await Reward.create({
    rewardId,
    deviceId,
    rewardType: settings.rewardType,
    value: settings.rewardValue,
    status: 'ACTIVE',
    expiresAt
  });

  await deviceService.recordDeviceClaim(deviceId);

  return {
    success: true,
    message: 'Reward claimed successfully!',
    reward: newReward
  };
};

const getRewardById = async (rewardId) => {
  if (!rewardId) return null;
  return await Reward.findOne({ rewardId: rewardId.toUpperCase().trim() });
};

/**
 * Redeem reward using customer GPS position & restaurant geofence radius
 */
const redeemRewardWithLocation = async (rewardId, userLat, userLng) => {
  const reward = await Reward.findOne({ rewardId: rewardId.toUpperCase().trim() });

  if (!reward) {
    return { success: false, message: 'Reward code not found.' };
  }

  if (reward.status === 'REDEEMED') {
    return { success: false, message: 'This reward has already been redeemed.' };
  }

  if (reward.status !== 'ACTIVE') {
    return { success: false, message: `Reward is not active (Status: ${reward.status}).` };
  }

  if (new Date() > new Date(reward.expiresAt)) {
    reward.status = 'EXPIRED';
    await reward.save();
    return { success: false, message: 'This reward has expired.' };
  }

  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }

  // Geofence Distance Verification
  const radiusCheck = locationService.isWithinRadius(
    parseFloat(userLat),
    parseFloat(userLng),
    settings.latitude,
    settings.longitude,
    settings.redemptionRadius
  );

  if (!radiusCheck.isWithin) {
    return {
      success: false,
      message: `You must be inside the restaurant to redeem. You are currently ${radiusCheck.distanceMeters}m away (allowed: ${settings.redemptionRadius}m).`,
      distanceMeters: radiusCheck.distanceMeters
    };
  }

  // Complete Redemption
  reward.status = 'REDEEMED';
  reward.redeemedAt = new Date();
  await reward.save();

  return {
    success: true,
    message: 'Reward redeemed successfully! Show this screen to restaurant staff.',
    reward
  };
};

module.exports = {
  generateUniqueRewardId,
  createRewardForDevice,
  getRewardById,
  redeemRewardWithLocation
};