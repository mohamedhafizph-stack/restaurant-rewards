const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // Restaurant Details
    name: {
      type: String,
      default: 'Adoraise Partner Restaurant'
    },
    logo: {
      type: String,
      default: '/images/default-logo.png'
    },
    coverImage: {
      type: String,
      default: '/images/default-cover.jpg'
    },
    description: {
      type: String,
      default: 'Enjoy delicious food and exclusive instant rewards!'
    },
    address: {
      type: String,
      default: '123 Main Street'
    },
    phone: {
      type: String,
      default: '+91 9876543210'
    },
    latitude: {
      type: Number,
      default: 9.9312328
    },
    longitude: {
      type: Number,
      default: 76.2673041
    },
    redemptionRadius: {
      type: Number,
      default: 100 // Allowed radius in meters
    },

    // Global Reward Settings
    rewardEnabled: {
      type: Boolean,
      default: true
    },
    rewardType: {
      type: String,
      enum: ['DISCOUNT_AMOUNT', 'DISCOUNT_PERCENTAGE', 'FREE_ITEM'],
      default: 'DISCOUNT_AMOUNT'
    },
    rewardValue: {
      type: String,
      default: '₹50 OFF'
    },
    rewardExpiryHours: {
      type: Number,
      default: 24 // Reward expires 24 hours after claiming
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Settings', settingsSchema);