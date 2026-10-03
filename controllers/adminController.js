const Settings = require('../models/Settings');
const Reward = require('../models/Reward');
const Device = require('../models/Device');

/**
 * Render Admin Dashboard
 */
const getDashboard = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    // Basic Analytics Metrics
    const totalDevices = await Device.countDocuments();
    const totalRewards = await Reward.countDocuments();
    const activeRewards = await Reward.countDocuments({ status: 'ACTIVE' });
    const redeemedRewards = await Reward.countDocuments({ status: 'REDEEMED' });

    res.render('admin/dashboard', {
      settings,
      stats: {
        totalDevices,
        totalRewards,
        activeRewards,
        redeemedRewards
      },
      message: req.query.msg || null
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    res.status(500).send('Server Error loading admin dashboard');
  }
};

/**
 * Update Restaurant & Reward Settings
 */
const updateSettings = async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      phone,
      latitude,
      longitude,
      redemptionRadius,
      rewardEnabled,
      rewardType,
      rewardValue,
      rewardExpiryHours
    } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    settings.name = name || settings.name;
    settings.description = description || settings.description;
    settings.address = address || settings.address;
    settings.phone = phone || settings.phone;
    settings.latitude = parseFloat(latitude) || settings.latitude;
    settings.longitude = parseFloat(longitude) || settings.longitude;
    settings.redemptionRadius = parseInt(redemptionRadius, 10) || settings.redemptionRadius;
    settings.rewardEnabled = rewardEnabled === 'on' || rewardEnabled === true;
    settings.rewardType = rewardType || settings.rewardType;
    settings.rewardValue = rewardValue || settings.rewardValue;
    settings.rewardExpiryHours = parseInt(rewardExpiryHours, 10) || settings.rewardExpiryHours;

    await settings.save();

    res.redirect('/admin?msg=Settings updated successfully');
  } catch (error) {
    console.error('Update Settings Error:', error);
    res.status(500).send('Server Error updating settings');
  }
};

module.exports = {
  getDashboard,
  updateSettings
};