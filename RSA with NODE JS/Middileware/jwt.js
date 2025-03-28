const jwt = require('jsonwebtoken');
require('dotenv').config(); // Load .env variables
//token
module.exports = function (req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'Authorization token is missing' });
  }

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    console.log(error.message,token )
    return res.status(401).json({ message: 'Invalid token' });
  }
};
