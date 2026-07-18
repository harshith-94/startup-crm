import { errorResponse } from '../utils/apiResponse.js';

/**
 * Express Global Error Handling Middleware.
 * Parses validation errors, cast errors, duplicate key entries, and JWT issues
 * into clean, standardized API error responses.
 */
const errorHandler = (err, req, res, next) => {
  // Log the complete error internally for server administration/debugging
  console.error('Express Error Handler Log:', err);

  let statusCode = 500;
  let message = 'Server error';
  let errors = null;

  // 1. Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = {};
    Object.keys(err.errors).forEach((key) => {
      errors[key] = err.errors[key].message;
    });
  }
  // 2. Mongoose CastError (invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  }
  // 3. MongoDB duplicate key (code 11000)
  else if (err.code === 11000) {
    statusCode = 409;
    const keyPattern = err.keyPattern || {};
    if (keyPattern.email) {
      message = 'Email already exists';
    } else {
      message = 'Duplicate field value entered';
    }
  }
  // 4. JWT verification and expiry errors
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
  }
  // 5. Check if standard operational error status is set
  else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Construct response payload
  const responsePayload = {
    success: false,
    message,
    errors,
  };

  // Add err.stack only when running in development mode
  if (process.env.NODE_ENV === 'development') {
    responsePayload.stack = err.stack;
  }

  return res.status(statusCode).json(responsePayload);
};

export default errorHandler;
