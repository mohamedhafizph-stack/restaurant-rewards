const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema(
  {
    rewardId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    deviceId: {
      type: String,
      required: true,
      index: true
    },
    rewardType: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    redeemedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Reward', rewardSchema);