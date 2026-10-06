const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

dotenv.config();

const connectDB = require('./config/db');

const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes');

connectDB();

const app = express();

const PORT = process.env.PORT || 3000;


/*
============================================================
MIDDLEWARE
============================================================
*/

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);


/*
============================================================
STATIC FILES
============================================================
*/

app.use(
  express.static(
    path.join(__dirname, 'public')
  )
);


/*
============================================================
EJS
============================================================
*/

app.set(
  'view engine',
  'ejs'
);

app.set(
  'views',
  path.join(__dirname, 'views')
);


/*
============================================================
PERSISTENT DEVICE ID
============================================================

The device ID is stored in a browser cookie.

This means:

Customer opens restaurant page
        ↓
No device cookie?
        ↓
Create device ID
        ↓
Save it in browser
        ↓
Customer scratches
        ↓
Reloads page
        ↓
Same device ID
        ↓
Daily limit works
============================================================
*/

app.use((req, res, next) => {

  let deviceId =
    req.headers['x-device-id'] ||
    req.query.deviceId;


  /*
  ----------------------------------------------------------
  Check existing cookie
  ----------------------------------------------------------
  */

  if (!deviceId && req.headers.cookie) {

    const cookies =
      req.headers.cookie
        .split(';')
        .map(cookie => cookie.trim());

    const deviceCookie =
      cookies.find(cookie =>
        cookie.startsWith('deviceId=')
      );

    if (deviceCookie) {

      deviceId =
        decodeURIComponent(
          deviceCookie.substring(
            'deviceId='.length
          )
        );

    }

  }


  /*
  ----------------------------------------------------------
  Create new device ID if none exists
  ----------------------------------------------------------
  */

  if (!deviceId) {

    deviceId =
      'dev_' +
      crypto
        .randomBytes(12)
        .toString('hex');


    /*
    --------------------------------------------------------
    Save device ID in browser cookie
    --------------------------------------------------------
    */

    res.setHeader(
      'Set-Cookie',
      `deviceId=${encodeURIComponent(deviceId)}; Path=/; Max-Age=31536000; SameSite=Lax`
    );

  }


  /*
  ----------------------------------------------------------
  Make device ID available to controllers
  ----------------------------------------------------------
  */

  req.deviceId = deviceId;

  next();

});


/*
============================================================
CUSTOMER ROUTES
============================================================
*/

app.use(
  '/restaurant',
  customerRoutes
);


/*
============================================================
ADMIN ROUTES
============================================================
*/

app.use(
  '/admin',
  adminRoutes
);


/*
============================================================
HOME
============================================================
*/

app.get(
  '/',
  (req, res) => {

    res.redirect('/restaurant');

  }
);


/*
============================================================
SERVER
============================================================
*/

app.listen(
  PORT,
  () => {

    console.log(
      `Adoraise server running in ${
        process.env.NODE_ENV || 'development'
      } mode on http://localhost:${PORT}`
    );

  }
);