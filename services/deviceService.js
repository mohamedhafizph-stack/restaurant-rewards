const Device = require('../models/Device');

/**
 * Get current date string in YYYY-MM-DD format
 */
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if a device can claim a reward today
 * Returns { canClaim: boolean, message: string, device: Document }
 */
const checkDeviceEligibility = async (deviceId) => {
  if (!deviceId) {
    return { canClaim: false, message: 'Invalid device identifier.' };
  }

  const todayStr = getTodayDateString();
  let device = await Device.findOne({ deviceId });

  if (!device) {
    // New device — eligible
    return { canClaim: true, message: 'Device eligible for daily claim.', device: null };
  }

  if (device.lastClaimDate === todayStr) {
    return {
      canClaim: false,
      message: 'You have already claimed your reward for today! Come back tomorrow.',
      device
    };
  }

  return { canClaim: true, message: 'Device eligible for daily claim.', device };
};

/**
 * Record a successful claim for a device for today
 */
const recordDeviceClaim = async (deviceId) => {
  const todayStr = getTodayDateString();

  const device = await Device.findOneAndUpdate(
    { deviceId },
    { lastClaimDate: todayStr },
    { upsert: true, new: true }
  );

  return device;
};

module.exports = {
  getTodayDateString,
  checkDeviceEligibility,
  recordDeviceClaim
};