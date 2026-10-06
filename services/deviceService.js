const Device = require('../models/Device');

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

const checkDeviceEligibility = async (deviceId) => {
  if (!deviceId) {
    return {
      canClaim: false,
      message: 'Invalid device identifier.'
    };
  }

  const device = await Device.findOne({
    deviceId
  });

  if (!device) {
    return {
      canClaim: true,
      message: 'Device eligible for daily claim.',
      device: null
    };
  }

  const today = startOfToday();

  if (
    device.lastScratchedAt &&
    new Date(device.lastScratchedAt) >= today
  ) {
    return {
      canClaim: false,
      message:
        'You have already claimed your reward for today! Come back tomorrow.',
      device
    };
  }

  return {
    canClaim: true,
    message: 'Device eligible for daily claim.',
    device
  };
};

const recordDeviceClaim = async (deviceId) => {
  return Device.findOneAndUpdate(
    { deviceId },
    {
      lastScratchedAt: new Date()
    },
    {
      upsert: true,
      new: true
    }
  );
};

module.exports = {
  checkDeviceEligibility,
  recordDeviceClaim
};