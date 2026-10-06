const mongoose = require('mongoose');

const adSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    imageUrl: {
      type: String,
      required: true
    },

    cloudinaryPublicId: {
      type: String,
      required: true
    },

    link: {
      type: String,
      default: '',
      trim: true
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Ad', adSchema);