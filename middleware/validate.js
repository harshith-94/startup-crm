import { body, validationResult } from 'express-validator';

/**
 * Validation Factory Middleware: Wraps express-validator rules and formats errors.
 * If errors exist, returns a 400 Bad Request with formatted fields and messages.
 * @param {Array} validations - Array of express-validator rules
 * @returns {Function} Express middleware function
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations in parallel
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors to match the [{ field, message }] structure
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      errors: formattedErrors,
    });
  };
};

/**
 * Validation rules for creating or updating leads.
 */
export const leadRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Contact name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact name must be between 2 and 100 characters'),
  body('company')
    .trim()
    .notEmpty()
    .withMessage('Company name is required'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional({ values: 'falsy' })
    .trim(),
  body('status')
    .optional()
    .isIn(['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'])
    .withMessage('Status must be: New, Contacted, Meeting Scheduled, Proposal Sent, Won, or Lost'),
  body('source')
    .optional()
    .isIn(['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Other'])
    .withMessage('Source must be: Website, Referral, LinkedIn, Cold Call, Email Campaign, or Other'),
  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

// Export leadValidator wrapper for backward compatibility with leadRoutes.js
export const leadValidator = validate(leadRules);
