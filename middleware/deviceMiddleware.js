const { v4: uuidv4 } = require('uuid');

/**
 * Extracts deviceId from query string, custom headers, or cookies.
 * Generates and sets a 1-year HTTP-only cookie if none exists.
 */
const deviceMiddleware = (req, res, next) => {
  let deviceId = req.query.deviceId || req.cookies?.deviceId || req.headers['x-device-id'];

  if (!deviceId) {
    deviceId = 'DEV-' + uuidv4();
    res.cookie('deviceId', deviceId, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 Year
      httpOnly: true,
      sameSite: 'lax'
    });
  }

  req.deviceId = deviceId;
  next();
};

module.exports = deviceMiddleware;