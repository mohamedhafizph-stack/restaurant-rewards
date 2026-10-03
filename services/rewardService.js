const Reward = require('../models/Reward');
const Settings = require('../models/Settings');
const Device = require('../models/Device');
const locationService = require('./locationService');

/**
 * Get active reward or issue a new reward ticket for device
 */
const getOrCreateRewardForDevice = async (deviceId) => {
  let device = await Device.findOne({ deviceId });
  if (!device) {
    device = await Device.create({ deviceId });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let reward = await Reward.findOne({
    deviceId,
    createdAt: { $gte: today }
  });

  if (reward) {
    return { reward, isNew: false };
  }

  const settings = await Settings.findOne() || {};
  const expiryHours = settings.rewardExpiryHours || 24;

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiryHours);

  const rewardId = 'RW-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  reward = await Reward.create({
    rewardId,
    deviceId,
    rewardType: settings.rewardType || 'DISCOUNT_AMOUNT',
    value: settings.rewardValue || '₹50 OFF',
    status: 'ACTIVE',
    expiresAt
  });

  return { reward, isNew: true };
};

/**
 * Redeem reward after validating GPS location geofence
 */
const redeemRewardWithLocation = async (rewardId, userLat, userLng) => {
  try {
    const reward = await Reward.findOne({ rewardId });
    if (!reward) {
      return { success: false, message: 'Reward ticket not found.' };
    }

    if (reward.status !== 'ACTIVE') {
      return { success: false, message: `Reward is already ${reward.status.toLowerCase()}.` };
    }

    if (new Date() > new Date(reward.expiresAt)) {
      reward.status = 'EXPIRED';
      await reward.save();
      return { success: false, message: 'This reward ticket has expired.' };
    }

    let settings = await Settings.findOne();
    if (!settings) {
      return { success: false, message: 'Restaurant settings configured incorrectly.' };
    }

    const uLat = parseFloat(userLat);
    const uLng = parseFloat(userLng);
    const rLat = parseFloat(settings.latitude);
    const rLng = parseFloat(settings.longitude);
    const maxRadius = parseInt(settings.redemptionRadius, 10) || 500;

    if (isNaN(uLat) || isNaN(uLng)) {
      return { success: false, message: 'Invalid GPS coordinates provided by browser.' };
    }

    const locationCheck = locationService.isWithinRadius(uLat, uLng, rLat, rLng, maxRadius);

    if (!locationCheck.isWithin) {
      return {
        success: false,
        message: `You are too far from the restaurant (${locationCheck.distanceMeters}m away). Allowed distance is ${maxRadius}m.`
      };
    }

    reward.status = 'REDEEMED';
    reward.redeemedAt = new Date();
    await reward.save();

    return {
      success: true,
      message: `🎉 Success! Reward redeemed. Distance verified: ${locationCheck.distanceMeters}m.`
    };
  } catch (error) {
    console.error('Error in redeemRewardWithLocation:', error);
    return { success: false, message: 'Internal server error during location verification.' };
  }
};

module.exports = {
  getOrCreateRewardForDevice,
  redeemRewardWithLocation
};