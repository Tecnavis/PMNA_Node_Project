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

    req.user = decoded;
    next();
  } catch (error) {
    // never log the token itself
    return res.status(401).json({ code: 'AUTH_REQUIRED', message: error.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid token' });
  }
};
