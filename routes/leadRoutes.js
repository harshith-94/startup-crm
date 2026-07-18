import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import * as leadController from '../controllers/leadController.js';

const router = express.Router();

// Apply protect middleware to ALL routes in this file
router.use(protect);

// Define validation rules for creating/updating a lead
const leadRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Contact name is required')
    .isLength({ min: 2 })
    .withMessage('Contact name must be at least 2 characters long'),
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
    .withMessage('Notes cannot exceed 1000 characters')
];

// Validation rules for status update
const statusRules = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'])
    .withMessage('Status must be: New, Contacted, Meeting Scheduled, Proposal Sent, Won, or Lost')
];

// Static aggregate/analytics routes (must be placed before /:id parameterized routes)
router.get('/stats', leadController.getLeadStats);
router.get('/monthly-stats', leadController.getMonthlyStats);
router.get('/stats/summary', leadController.getLeadStats);
router.get('/stats/monthly', leadController.getMonthlyStats);

// standard CRUD routes
router
  .route('/')
  .get(leadController.getLeads)
  .post(validate(leadRules), leadController.createLead);

router
  .route('/:id')
  .get(leadController.getLeadById)
  .put(validate(leadRules), leadController.updateLead)
  .delete(leadController.deleteLead);

router.patch('/:id/status', validate(statusRules), leadController.updateLeadStatus);

export default router;

