const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { errorResponse } = require('../utils/helpers');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'No token provided', 401);
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return errorResponse(res, 'User not found or inactive', 401);
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return errorResponse(res, 'Token expired', 401);
    if (err.name === 'JsonWebTokenError') return errorResponse(res, 'Invalid token', 401);
    next(err);
  }
};

module.exports = { authenticate };
