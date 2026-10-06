const Settings =
  require('../models/Settings');

const Reward =
  require('../models/Reward');

const Device =
  require('../models/Device');

const Ad =
  require('../models/Ad');

const rewardService =
  require('../services/rewardService');

const QRCode =
  require('qrcode');

const getRestaurantPage =
  async (req, res) => {
    try {
      let settings =
        await Settings.findOne();

      if (!settings) {
        settings =
          await Settings.create({});
      }

      const deviceId =
        req.deviceId;

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const device =
        await Device.findOne({
          deviceId
        });

      const hasScratchedToday =
        !!(
          device &&
          device.lastScratchedAt &&
          new Date(
            device.lastScratchedAt
          ) >= today
        );

      const existingReward =
        await Reward.findOne({
          deviceId,
          createdAt: {
            $gte: today
          }
        });

      const ads =
        await Ad.find({
          isActive: true
        }).sort({
          createdAt: -1
        });

      res.render(
        'customer/restaurant',
        {
          settings,
          deviceId,
          hasScratchedToday,
          existingReward,
          ads
        }
      );
    } catch (error) {
      console.error(
        'Error loading restaurant page:',
        error
      );

      res.status(500).send(
        'Server Error'
      );
    }
  };

const claimReward =
  async (req, res) => {
    try {
      const deviceId =
        req.body.deviceId ||
        req.query.deviceId ||
        req.deviceId;

      const {
        latitude,
        longitude
      } = req.body;

      const result =
        await rewardService
          .getOrCreateRewardForDevice(
            deviceId,
            latitude,
            longitude
          );

      if (result.locationError) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      if (result.alreadyPlayed) {
        return res.json({
          success: true,
          alreadyPlayed: true,
          isWinner:
            result.isWinner,
          message:
            result.message,
          redirectUrl:
            result.reward
              ? `/restaurant/reward/${result.reward.rewardId}`
              : null
        });
      }

      if (result.isWinner) {
        return res.json({
          success: true,
          alreadyPlayed: false,
          isWinner: true,
          redirectUrl:
            `/restaurant/reward/${result.reward.rewardId}`
        });
      }

      return res.json({
        success: true,
        alreadyPlayed: false,
        isWinner: false,
        message:
          result.message ||
          'Better luck next time!'
      });
    } catch (error) {
      console.error(
        'Error in claimReward:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Server error processing game outcome.'
      });
    }
  };

const getRewardTicket =
  async (req, res) => {
    try {
      const {
        rewardId
      } = req.params;

      const reward =
        await Reward.findOne({
          rewardId
        });

      if (!reward) {
        return res.status(404).send(
          'Reward ticket not found'
        );
      }

      let settings =
        await Settings.findOne();

      if (!settings) {
        settings =
          await Settings.create({});
      }

      const ads =
        await Ad.find({
          isActive: true
        }).sort({
          createdAt: -1
        });

      res.render(
        'customer/reward',
        {
          reward,
          settings,
          ads
        }
      );
    } catch (error) {
      console.error(
        'Error loading reward ticket:',
        error
      );

      res.status(500).send(
        'Server Error'
      );
    }
  };

const submitUpiForPayout =
  async (req, res) => {
    try {
      const {
        rewardId,
        customerName,
        upiId
      } = req.body;

      if (
        !rewardId ||
        !customerName ||
        !upiId
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Full Name, Reward ID, and UPI ID are required.'
        });
      }

      const cleanName =
        customerName.trim();

      const cleanUpi =
        upiId.trim();

      if (cleanName.length < 2) {
        return res.status(400).json({
          success: false,
          message:
            'Please enter a valid full name.'
        });
      }

      if (cleanUpi.length < 3) {
        return res.status(400).json({
          success: false,
          message:
            'Please enter a valid UPI ID or Mobile Number.'
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
        reward.status !== 'ACTIVE'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'This reward is no longer available for payout submission.'
        });
      }

      if (
        reward.expiresAt &&
        new Date() >
          new Date(reward.expiresAt)
      ) {
        reward.status =
          'EXPIRED';

        await reward.save();

        return res.status(400).json({
          success: false,
          message:
            'This reward ticket has expired.'
        });
      }

      reward.customerName =
        cleanName;

      reward.upiId =
        cleanUpi;

      reward.status =
        'PENDING_PAYOUT';

      reward.payoutSubmittedAt =
        new Date();

      await reward.save();

      res.json({
        success: true,
        message:
          'Payout request submitted successfully!'
      });
    } catch (error) {
      console.error(
        'Error submitting UPI:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Server error saving payout details.'
      });
    }
  };

const redeemReward =
  async (req, res) => {
    try {
      const {
        rewardId,
        latitude,
        longitude
      } = req.body;

      if (
        !rewardId ||
        latitude === undefined ||
        longitude === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Reward ID and GPS location are required.'
        });
      }

      const result =
        await rewardService
          .redeemRewardWithLocation(
            rewardId,
            latitude,
            longitude
          );

      return res.json(result);
    } catch (error) {
      console.error(
        'Redeem Controller Error:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Server error processing redemption.'
      });
    }
  };

const getQrCode =
  async (req, res) => {
    try {
      const protocol =
        req.protocol;

      const host =
        req.get('host');

      const restaurantUrl =
        `${protocol}://${host}/restaurant`;

      const qrDataUrl =
        await QRCode.toDataURL(
          restaurantUrl,
          {
            width: 400,
            margin: 2
          }
        );

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Restaurant QR Code</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #f4f6f8;
              margin: 0;
            }

            .card {
              background: white;
              padding: 32px;
              border-radius: 16px;
              box-shadow: 0 4px 12px rgba(0,0,0,.1);
              text-align: center;
              max-width: 90%;
            }

            img {
              max-width: 100%;
              margin: 20px 0;
            }

            p {
              color: #6b7280;
              font-size: 14px;
              word-break: break-all;
            }

            a {
              color: #2563eb;
            }
          </style>
        </head>

        <body>
          <div class="card">
            <h2>Scan to Claim Your Reward!</h2>

            <img
              src="${qrDataUrl}"
              alt="Restaurant QR Code"
            />

            <p>
              Target URL:
              <a href="${restaurantUrl}">
                ${restaurantUrl}
              </a>
            </p>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error(
        'Error generating QR code:',
        error
      );

      res.status(500).send(
        'Error generating QR code'
      );
    }
  };

module.exports = {
  getRestaurantPage,
  claimReward,
  getRewardTicket,
  submitUpiForPayout,
  redeemReward,
  getQrCode
};