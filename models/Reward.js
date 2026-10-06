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

    value: {
      type: String,
      default: '₹100 Cashback'
    },

    rewardType: {
      type: String,
      default: 'CASHBACK'
    },

    status: {
      type: String,
      enum: [
        'ACTIVE',
        'PENDING_PAYOUT',
        'PAID',
        'EXPIRED',
        'REDEEMED'
      ],
      default: 'ACTIVE'
    },

    customerName: {
      type: String,
      default: ''
    },

    upiId: {
      type: String,
      default: ''
    },

    payoutSubmittedAt: {
      type: Date
    },

    paidAt: {
      type: Date
    },

    redeemedAt: {
      type: Date
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    expiresAt: {
      type: Date
    }
  }
);

module.exports = mongoose.model('Reward', rewardSchema);