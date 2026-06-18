const crypto = require('crypto');

const generateToken = (length = 32) => crypto.randomBytes(length).toString('hex');

const paginate = (page = 1, limit = 20) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  return { limit: parseInt(limit), offset };
};

const paginateResponse = (data, count, page, limit) => ({
  data,
  pagination: {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(count / parseInt(limit)),
    hasNext: parseInt(page) < Math.ceil(count / parseInt(limit)),
    hasPrev: parseInt(page) > 1,
  },
});

const successResponse = (res, data, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const errorResponse = (res, message = 'Internal server error', statusCode = 500, errors = null) =>
  res.status(statusCode).json({ success: false, message, ...(errors && { errors }) });

module.exports = { generateToken, paginate, paginateResponse, successResponse, errorResponse };
