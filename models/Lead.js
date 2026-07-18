import mongoose from 'mongoose';

/**
 * Mongoose Schema defining the Lead structure in Startup CRM Lite.
 */
const leadSchema = new mongoose.Schema(
  {
    /**
     * Owner (User) who created and owns the lead.
     * @type {mongoose.Schema.Types.ObjectId}
     */
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Lead must have a valid owner reference'],
    },
    /**
     * Contact name of the lead.
     * Must be between 2 and 100 characters.
     * @type {String}
     */
    name: {
      type: String,
      required: [true, 'Lead contact name is required'],
      trim: true,
      minlength: [2, 'Contact name must be at least 2 characters long'],
      maxlength: [100, 'Contact name cannot exceed 100 characters'],
    },
    /**
     * Company associated with the lead.
     * @type {String}
     */
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    /**
     * Email address of the lead.
     * Must follow proper email format syntax.
     * @type {String}
     */
    email: {
      type: String,
      required: [true, 'Lead email address is required'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Email must be a valid email address',
      ],
    },
    /**
     * Phone number of the lead contact (optional).
     * @type {String}
     */
    phone: {
      type: String,
      trim: true,
    },
    /**
     * Progress status of the lead in the pipeline.
     * @type {String}
     */
    status: {
      type: String,
      enum: {
        values: ['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'],
        message: 'Status must be: New, Contacted, Meeting Scheduled, Proposal Sent, Won, or Lost',
      },
      default: 'New',
    },
    /**
     * The acquisition source where the lead was generated.
     * @type {String}
     */
    source: {
      type: String,
      enum: {
        values: ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Other'],
        message: 'Source must be: Website, Referral, LinkedIn, Cold Call, Email Campaign, or Other',
      },
      default: 'Website',
    },
    /**
     * Custom text notes or description about the lead.
     * @type {String}
     */
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field: age (returns number of days since the lead was created)
leadSchema.virtual('age').get(function () {
  if (!this.createdAt) return 0;
  const diffInMs = Date.now() - this.createdAt.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return Math.floor(diffInDays);
});

// Configure JSON transform to include virtuals, convert _id to id, and remove versionKey
leadSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

// Indexes for optimized lookups and queries
leadSchema.index({ owner: 1, status: 1 });
leadSchema.index({ email: 1 });

const Lead = mongoose.model('Lead', leadSchema);

export { leadSchema };
export default Lead;


