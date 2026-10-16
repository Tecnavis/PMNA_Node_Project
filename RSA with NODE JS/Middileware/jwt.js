const jwt = require('jsonwebtoken');
require('dotenv').config(); // Load .env variables
//token
module.exports = function (req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ code: 'AUTH_REQUIRED', message: 'Authorization token is missing' });
  }

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);

    // TV-screen tokens are view-only and work only on /tv/live
    if (decoded && decoded.role === 'TV') {
      return res.status(403).json({ message: 'Not allowed' });
    }
    // Public customer logins (RSA app) only work on the customer API
    if (decoded && decoded.role === 'Customer' && !String(req.originalUrl || '').startsWith('/customer/')) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    // never log the token itself
    return res.status(401).json({ code: 'AUTH_REQUIRED', message: error.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid token' });
  }
};
