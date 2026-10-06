const Reward = require('../models/Reward');
const Settings = require('../models/Settings');
const Device = require('../models/Device');
const locationService = require('./locationService');
const crypto = require('crypto');

function startOfToday() {
  const date = new Date();

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function getDateKey() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function getDailyTargetNumber(
  dateString,
  maxRange = 100
) {
  const hash = crypto
    .createHash('sha256')
    .update(dateString)
    .digest('hex');

  const numberFromHash =
    parseInt(hash.substring(0, 8), 16);

  return (numberFromHash % maxRange) + 1;
}

function checkLocation(
  settings,
  userLat,
  userLng
) {
  const uLat = parseFloat(userLat);
  const uLng = parseFloat(userLng);

  const restaurantLat =
    parseFloat(settings.latitude);

  const restaurantLng =
    parseFloat(settings.longitude);

  const radius =
    Number(settings.redemptionRadius) || 100;

  if (
    !Number.isFinite(uLat) ||
    !Number.isFinite(uLng)
  ) {
    return {
      valid: false,
      message:
        'GPS location permission is required. Please allow location access and try again.'
    };
  }

  if (
    !Number.isFinite(restaurantLat) ||
    !Number.isFinite(restaurantLng)
  ) {
    return {
      valid: false,
      message:
        'Restaurant GPS coordinates are not configured correctly.'
    };
  }

  const result =
    locationService.isWithinRadius(
      uLat,
      uLng,
      restaurantLat,
      restaurantLng,
      radius
    );

  if (!result.isWithin) {
    return {
      valid: false,
      message:
        `You are approximately ${result.distanceMeters}m away from the restaurant. ` +
        `Please be inside the restaurant to claim your reward. ` +
        `Allowed distance: ${radius}m.`
    };
  }

  return {
    valid: true,
    distanceMeters: result.distanceMeters
  };
}

const getOrCreateRewardForDevice = async (
  deviceId,
  userLat,
  userLng
) => {
  const settings =
    await Settings.findOne() ||
    await Settings.create({});

  if (!settings.rewardEnabled) {
    return {
      alreadyPlayed: false,
      isWinner: false,
      locationError: true,
      message:
        'Reward claiming is currently disabled by the restaurant.'
    };
  }

  /*
   * IMPORTANT:
   * GPS is checked BEFORE the device attempt
   * is consumed.
   */
  const location = checkLocation(
    settings,
    userLat,
    userLng
  );

  if (!location.valid) {
    return {
      alreadyPlayed: false,
      isWinner: false,
      locationError: true,
      message: location.message
    };
  }

  if (!deviceId) {
    return {
      alreadyPlayed: false,
      isWinner: false,
      locationError: true,
      message: 'Invalid device identifier.'
    };
  }

  const today = startOfToday();

  let device =
    await Device.findOne({ deviceId });

  if (!device) {
    device = await Device.create({
      deviceId
    });
  }

  /*
   * Already played today?
   */
  if (
    device.lastScratchedAt &&
    new Date(device.lastScratchedAt) >= today
  ) {
    const existingReward =
      await Reward.findOne({
        deviceId,
        createdAt: {
          $gte: today
        }
      });

    if (existingReward) {
      return {
        alreadyPlayed: true,
        isWinner: true,
        reward: existingReward,
        message:
          'You already claimed your reward ticket for today!'
      };
    }

    return {
      alreadyPlayed: true,
      isWinner: false,
      message:
        'You have already used your daily scratch attempt today. Come back tomorrow!'
    };
  }

  /*
   * Mark the device as having played ONLY AFTER
   * GPS verification succeeded.
   */
  device.lastScratchedAt = new Date();

  await device.save();

  const totalScratchedToday =
    await Device.countDocuments({
      lastScratchedAt: {
        $gte: today
      }
    });

  const existingWinner =
    await Reward.findOne({
      createdAt: {
        $gte: today
      }
    });

  /*
   * Only one winner per day.
   */
  if (existingWinner) {
    return {
      alreadyPlayed: false,
      isWinner: false,
      message: 'Better luck next time!'
    };
  }

  /*
   * Winner position is between 1 and 100.
   *
   * Example:
   * If today's target = 37,
   * the 37th valid player wins.
   */
  const targetWinnerPosition =
    getDailyTargetNumber(
      getDateKey(),
      1
    );

  const isWinner =
    totalScratchedToday === targetWinnerPosition;

  if (!isWinner) {
    return {
      alreadyPlayed: false,
      isWinner: false,
      message: 'Better luck next time!'
    };
  }

  const expiryHours =
    Number(settings.rewardExpiryHours) || 24;

  const expiresAt = new Date();

  expiresAt.setHours(
    expiresAt.getHours() + expiryHours
  );

  const rewardId =
    'RW-' +
    crypto.randomBytes(4)
      .toString('hex')
      .toUpperCase();

  const reward =
    await Reward.create({
      rewardId,
      deviceId,

      rewardType:
        settings.rewardType ||
        'DISCOUNT_AMOUNT',

      value:
        settings.rewardValue ||
        '₹100 Cashback',

      status: 'ACTIVE',

      expiresAt
    });

  return {
    alreadyPlayed: false,
    isWinner: true,
    reward
  };
};

const redeemRewardWithLocation = async (
  rewardId,
  userLat,
  userLng
) => {
  try {
    const reward =
      await Reward.findOne({
        rewardId
      });

    if (!reward) {
      return {
        success: false,
        message: 'Reward ticket not found.'
      };
    }

    if (reward.status !== 'ACTIVE') {
      return {
        success: false,
        message:
          `Reward is already ${reward.status.toLowerCase()}.`
      };
    }

    if (
      reward.expiresAt &&
      new Date() > new Date(reward.expiresAt)
    ) {
      reward.status = 'EXPIRED';

      await reward.save();

      return {
        success: false,
        message:
          'This reward ticket has expired.'
      };
    }

    const settings =
      await Settings.findOne();

    if (!settings) {
      return {
        success: false,
        message:
          'Restaurant settings are not configured.'
      };
    }

    const location =
      checkLocation(
        settings,
        userLat,
        userLng
      );

    if (!location.valid) {
      return {
        success: false,
        message: location.message
      };
    }

    reward.status = 'REDEEMED';

    reward.redeemedAt =
      new Date();

    await reward.save();

    return {
      success: true,
      message:
        `🎉 Reward redeemed successfully! ` +
        `You are ${location.distanceMeters}m from the restaurant.`
    };
  } catch (error) {
    console.error(
      'Error redeeming reward:',
      error
    );

    return {
      success: false,
      message:
        'Server error during redemption.'
    };
  }
};

module.exports = {
  getOrCreateRewardForDevice,
  redeemRewardWithLocation
};