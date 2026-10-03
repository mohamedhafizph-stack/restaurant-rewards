const Reward = require('../models/Reward');
const Settings = require('../models/Settings');
const Device = require('../models/Device');
const locationService = require('./locationService');
const crypto = require('crypto');

/**
 * Generate a deterministic random target number (between 1 and maxRange) 
 * for a given date string (YYYY-MM-DD).
 */
const getDailyTargetNumber = (dateString, maxRange = 200) => {
  const hash = crypto.createHash('sha256').update(dateString).digest('hex');
  const numberFromHash = parseInt(hash.substring(0, 8), 16);
  return (numberFromHash % maxRange) + 1; // Returns a number from 1 to maxRange
};

/**
 * Handle scratch-and-win logic:
 * - 1 scratch attempt per device per day.
 * - Random N-th customer of the day automatically wins (1 global winner/day).
 */
const getOrCreateRewardForDevice = async (deviceId) => {
  let device = await Device.findOne({ deviceId });
  if (!device) {
    device = await Device.create({ deviceId });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateKey = today.toISOString().split('T')[0]; // e.g., "2026-10-03"

  // 1. Check if THIS device already has a winning ticket today
  let existingReward = await Reward.findOne({
    deviceId,
    createdAt: { $gte: today }
  });

  if (existingReward) {
    return {
      alreadyPlayed: true,
      isWinner: true,
      reward: existingReward,
      message: 'You already claimed your reward ticket for today!'
    };
  }

  // 2. Check if THIS device already attempted scratching today
  if (device.lastScratchedAt && new Date(device.lastScratchedAt) >= today) {
    return {
      alreadyPlayed: true,
      isWinner: false,
      message: 'You have already used your daily scratch attempt today. Come back tomorrow!'
    };
  }

  // Record daily scratch attempt timestamp FIRST
  device.lastScratchedAt = new Date();
  await device.save();

  // 3. Count total devices that have scratched today (including current player)
  const totalScratchedToday = await Device.countDocuments({
    lastScratchedAt: { $gte: today }
  });

  // 4. Check if ANY device has already won today (Limit: 1 global winner per day)
  const totalWinnersToday = await Reward.countDocuments({
    createdAt: { $gte: today }
  });

  if (totalWinnersToday >= 1) {
    return { alreadyPlayed: false, isWinner: false };
  }

  // 5. Determine today's secret random winning spot (between 1 and MAX_RANGE)
  const MAX_RANGE = 200; // Winning customer will be a random position between 1 and 200
  const targetWinnerPosition = getDailyTargetNumber(dateKey, MAX_RANGE);

  // Check if current user's attempt order matches today's target position
  const isWinner = totalScratchedToday === targetWinnerPosition;

  if (!isWinner) {
    return { alreadyPlayed: false, isWinner: false };
  }

  // 6. Player IS today's random N-th customer! Create the winning reward ticket
  const settings = (await Settings.findOne()) || {};
  const expiryHours = settings.rewardExpiryHours || 24;

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiryHours);

  const rewardId = 'RW-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const reward = await Reward.create({
    rewardId,
    deviceId,
    rewardType: settings.rewardType || 'DISCOUNT_AMOUNT',
    value: settings.rewardValue || '₹50 OFF',
    status: 'ACTIVE',
    expiresAt
  });

  return { alreadyPlayed: false, isWinner: true, reward };
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