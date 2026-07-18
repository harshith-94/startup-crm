import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Authentication Middleware: Verify JWT and attach user object to the request.
 * Handles missing token, invalid token, expired token, and missing user.
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in authorization header and has 'Bearer' scheme
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 'No token provided, access denied', 401);
    }

    try {
      // Decode and verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Retrieve user from database (omit password details)
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return errorResponse(res, 'User belonging to this token no longer exists', 401);
      }

      // Attach user context to request
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return errorResponse(res, 'Token has expired, please login again', 401);
      }
      return errorResponse(res, 'Token is invalid', 401);
    }
  } catch (error) {
    next(error);
  }
};
