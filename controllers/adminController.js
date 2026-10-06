const Settings = require('../models/Settings');
const Reward = require('../models/Reward');
const Device = require('../models/Device');
const Ad = require('../models/Ad');

const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');


const getDashboard = async (req, res) => {
  try {
    let settings =
      await Settings.findOne();

    if (!settings) {
      settings =
        await Settings.create({});
    }

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const totalDevicesToday =
      await Device.countDocuments({
        lastScratchedAt: {
          $gte: today
        }
      });

    const activeRewards =
      await Reward.countDocuments({
        status: 'ACTIVE',
        createdAt: {
          $gte: today
        }
      });

    const pendingPayouts =
      await Reward.find({
        status: 'PENDING_PAYOUT'
      }).sort({
        payoutSubmittedAt: -1
      });

    const completedPayouts =
      await Reward.find({
        status: 'PAID'
      })
        .sort({
          paidAt: -1
        })
        .limit(20);

    const ads =
      await Ad.find()
        .sort({
          createdAt: -1
        });

    const message =
      req.query.message || null;

    res.render(
      'admin/dashboard',
      {
        settings,

        stats: {
          totalDevicesToday,
          activeRewards,
          pendingPayoutsCount:
            pendingPayouts.length,
          completedPayoutsCount:
            completedPayouts.length
        },

        pendingPayouts,
        completedPayouts,
        ads,
        message
      }
    );
  } catch (error) {
    console.error(
      'Error loading Admin Dashboard:',
      error
    );

    res
      .status(500)
      .send(
        'Server Error loading Admin Dashboard'
      );
  }
};


const updateSettings = async (
  req,
  res
) => {
  try {
    const {
      name,
      phone,
      address,
      rewardType,
      rewardValue,
      rewardExpiryHours,
      rewardEnabled,
      latitude,
      longitude,
      redemptionRadius
    } = req.body;

    let settings =
      await Settings.findOne();

    if (!settings) {
      settings =
        new Settings();
    }

    if (name !== undefined)
      settings.name = name;

    if (phone !== undefined)
      settings.phone = phone;

    if (address !== undefined)
      settings.address = address;

    if (rewardType !== undefined)
      settings.rewardType =
        rewardType;

    if (rewardValue !== undefined)
      settings.rewardValue =
        rewardValue;

    if (
      rewardExpiryHours !==
      undefined
    ) {
      settings.rewardExpiryHours =
        Number(rewardExpiryHours);
    }

    settings.rewardEnabled =
      rewardEnabled === true ||
      rewardEnabled === 'true' ||
      rewardEnabled === 'on';

    if (latitude !== undefined)
      settings.latitude =
        Number(latitude);

    if (longitude !== undefined)
      settings.longitude =
        Number(longitude);

    if (
      redemptionRadius !==
      undefined
    ) {
      settings.redemptionRadius =
        Number(redemptionRadius);
    }

    await settings.save();

    return res.json({
      success: true,
      message:
        'Settings updated successfully!'
    });
  } catch (error) {
    console.error(
      'Error updating settings:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error updating settings.'
    });
  }
};


/*
 * Upload image buffer to Cloudinary
 */
const uploadToCloudinary = (
  buffer
) => {
  return new Promise(
    (resolve, reject) => {
      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            folder: 'adoraise/ads',

            resource_type: 'image'
          },

          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

      Readable
        .from(buffer)
        .pipe(uploadStream);
    }
  );
};


const createAd = async (
  req,
  res
) => {
  try {
    if (!req.file) {
      return res.status(400).send(
        'Please select an image.'
      );
    }

    const {
      title,
      link
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).send(
        'Ad title is required.'
      );
    }

    /*
     * Upload image to Cloudinary
     */
    const cloudinaryResult =
      await uploadToCloudinary(
        req.file.buffer
      );

    if (
      !cloudinaryResult ||
      !cloudinaryResult.secure_url
    ) {
      return res.status(500).send(
        'Image upload to Cloudinary failed.'
      );
    }

    /*
     * Save Cloudinary URL + public ID
     * in MongoDB
     */
    await Ad.create({
      title: title.trim(),

      imageUrl:
        cloudinaryResult.secure_url,

      cloudinaryPublicId:
        cloudinaryResult.public_id,

      link: link
        ? link.trim()
        : '',

      isActive: true
    });

    res.redirect(
      '/admin?message=Advertisement+uploaded+successfully'
    );

  } catch (error) {
    console.error(
      'Error creating ad:',
      error
    );

    res.status(500).send(
      'Error uploading advertisement.'
    );
  }
};


const toggleAd = async (
  req,
  res
) => {
  try {
    const ad =
      await Ad.findById(
        req.params.id
      );

    if (!ad) {
      return res.status(404).json({
        success: false,
        message:
          'Advertisement not found.'
      });
    }

    ad.isActive =
      !ad.isActive;

    await ad.save();

    res.json({
      success: true,
      isActive: ad.isActive,
      message:
        ad.isActive
          ? 'Advertisement activated.'
          : 'Advertisement deactivated.'
    });

  } catch (error) {
    console.error(
      'Error toggling ad:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        'Server error.'
    });
  }
};


const deleteAd = async (
  req,
  res
) => {
  try {
    const ad =
      await Ad.findById(
        req.params.id
      );

    if (!ad) {
      return res.status(404).send(
        'Advertisement not found.'
      );
    }

    /*
     * Delete image from Cloudinary
     */
    if (ad.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(
          ad.cloudinaryPublicId,
          {
            resource_type: 'image'
          }
        );
      } catch (cloudinaryError) {
        console.error(
          'Cloudinary delete error:',
          cloudinaryError
        );
      }
    }

    /*
     * Delete advertisement
     * from MongoDB
     */
    await Ad.findByIdAndDelete(
      req.params.id
    );

    res.redirect(
      '/admin?message=Advertisement+deleted'
    );

  } catch (error) {
    console.error(
      'Error deleting ad:',
      error
    );

    res.status(500).send(
      'Error deleting advertisement.'
    );
  }
};


const markPayoutAsPaid = async (
  req,
  res
) => {
  try {
    const {
      rewardId
    } = req.body;

    if (!rewardId) {
      return res.status(400).json({
        success: false,
        message:
          'Reward ID is required.'
      });
    }

    const reward =
      await Reward.findOne({
        rewardId
      });

    if (!reward) {
      return res.status(404).json({
        success: false,
        message:
          'Reward ticket not found.'
      });
    }

    if (
      reward.status !==
      'PENDING_PAYOUT'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This reward is not waiting for payout.'
      });
    }

    reward.status = 'PAID';

    reward.paidAt =
      new Date();

    await reward.save();

    res.json({
      success: true,
      message:
        `Reward ${rewardId} has been marked as PAID!`
    });

  } catch (error) {
    console.error(
      'Error marking payout as paid:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        'Server error updating payout.'
    });
  }
};


module.exports = {
  getDashboard,
  updateSettings,
  createAd,
  toggleAd,
  deleteAd,
  markPayoutAsPaid
};