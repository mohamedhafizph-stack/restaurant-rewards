const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    // Formatted date string (e.g., "YYYY-MM-DD") representing the last calendar date a claim occurred
    lastClaimDate: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Device', deviceSchema);