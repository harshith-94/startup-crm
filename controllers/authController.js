import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * PRODUCTION NOTE:
 * For production deployments, express-rate-limit should be mounted
 * in the server initialization stack (server.js) or route files (authRoutes.js)
 * specifically targeting '/api/auth/login' and '/api/auth/register' to prevent
 * brute-force credential stuffing and denial of service attacks.
 * Example setup:
 *   import rateLimit from 'express-rate-limit';
 *   const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
 *   router.post('/login', authLimiter, validate(loginRules), login);
 */

/**
 * Helper function to generate signed JWT for user authentication.
 * @param {string} userId - User ID to sign
 * @returns {string} Signed JWT
 */
export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Register a new user.
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return errorResponse(res, 'User already registered with this email.', 400);
    }

    // Create the user
    const user = await User.create({
      name,
      email,
      password,
    });

    const token = generateToken(user._id);

    // toJSON override automatically removes the password field
    return successResponse(
      res,
      {
        user,
        token,
      },
      'User registered successfully.',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Retrieve user by email (include password field specifically for verification)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Check if user account is active
    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated', 403);
    }

    // Compare entered password with hashed password in database
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    const token = generateToken(user._id);

    // Convert to JSON (removes password automatically via toJSON override)
    const sanitizedUser = user.toJSON();

    return successResponse(
      res,
      {
        user: sanitizedUser,
        token,
      },
      'Login successful.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve current user profile details.
 */
export const getProfile = async (req, res, next) => {
  try {
    // req.user is already populated by the protect middleware (excluding password)
    return successResponse(res, req.user, 'Profile retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile details (allows updating name and/or changing password).
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, oldPassword, newPassword } = req.body;

    // Retrieve user including password to validate old password if changing it
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Allow updating name only
    if (name) {
      user.name = name;
    }

    // If changing password, validate old password first
    if (newPassword) {
      if (!oldPassword) {
        return errorResponse(res, 'Current password is required to change password', 400);
      }

      const isMatch = await user.comparePassword(oldPassword);
      if (!isMatch) {
        return errorResponse(res, 'Invalid current password', 401);
      }

      user.password = newPassword; // Schema pre-save hook will hash this on save
    }

    await user.save();

    // Convert user document to JSON (password field is automatically removed)
    const sanitizedUser = user.toJSON();

    return successResponse(res, sanitizedUser, 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Log out current user (stateless invalidate simulation).
 */
export const logout = async (req, res, next) => {
  try {
    return successResponse(res, null, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
};
