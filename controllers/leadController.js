import Lead from '../models/Lead.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse.js';

/**
 * Retrieve all leads scoped to the logged-in user with filtering, pagination, and sorting.
 * 
 * Inputs:
 * - req.user._id: ObjectId of the authenticated owner
 * - req.query: { status, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' }
 * 
 * Outputs:
 * - JSON response via paginatedResponse containing leads array and pagination info
 * 
 * Side Effects:
 * - Logs the request details to console in development
 */
export const getLeads = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Lead Controller] getLeads called by user: ${req.user._id}`);
    }

    const {
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build filter object: always include { owner: req.user._id }
    const filter = { owner: req.user._id };

    // If status provided and not 'All': add { status }
    if (status && status !== 'All') {
      filter.status = status;
    }

    // If search provided: add { $or: [ { name: regex }, { company: regex }, { email: regex } ] }
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { name: regex },
        { company: regex },
        { email: regex },
      ];
    }

    // Parse pagination parameters
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skipVal = (pageNum - 1) * limitNum;

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Use Lead.find(filter) with .sort(), .skip((page-1)*limit), .limit(limit)
    // Run Lead.countDocuments(filter) for pagination total
    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort(sort)
        .skip(skipVal)
        .limit(limitNum),
      Lead.countDocuments(filter),
    ]);

    // Return paginatedResponse with leads array and pagination info
    return paginatedResponse(res, leads, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new lead scoped to the logged-in user.
 * 
 * Inputs:
 * - req.user._id: ObjectId of the authenticated owner
 * - req.body: Lead creation fields
 * 
 * Outputs:
 * - JSON response with HTTP 201 and the newly created lead object
 * 
 * Side Effects:
 * - Inserts a new lead document into MongoDB
 * - Logs the request details to console in development
 */
export const createLead = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Lead Controller] createLead called by user: ${req.user._id}`);
    }

    // Destructure req.body fields
    const { name, company, email, phone, status, source, notes } = req.body;
    const body = { name, company, email, phone, status, source, notes };

    // Create new Lead: { ...body, owner: req.user._id }
    const lead = await Lead.create({
      ...body,
      owner: req.user._id,
    });

    // Return 201 with the new lead
    return successResponse(res, lead, 'Lead created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve a single lead record after verifying owner authorization.
 * 
 * Inputs:
 * - req.user._id: ObjectId of the authenticated owner
 * - req.params.id: Lead database identifier
 * 
 * Outputs:
 * - JSON response with status 200 and the lead object, or 404 error if missing
 * 
 * Side Effects:
 * - Logs the request details to console in development
 */
export const getLeadById = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Lead Controller] getLeadById called for ID: ${req.params.id} by user: ${req.user._id}`);
    }

    // Find by { _id: req.params.id, owner: req.user._id }
    const lead = await Lead.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    // If not found: 404 "Lead not found"
    if (!lead) {
      return errorResponse(res, 'Lead not found', 404);
    }

    // Return the lead
    return successResponse(res, lead, 'Lead retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Update a lead record after verifying owner authorization.
 * 
 * Inputs:
 * - req.user._id: ObjectId of the authenticated owner
 * - req.params.id: Lead database identifier
 * - req.body: Lead fields to update
 * 
 * Outputs:
 * - JSON response with status 200 and the updated lead, or 404 error if missing
 * 
 * Side Effects:
 * - Updates the matched lead document in MongoDB
 * - Logs the request details to console in development
 */
export const updateLead = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Lead Controller] updateLead called for ID: ${req.params.id} by user: ${req.user._id}`);
    }

    // Find by { _id: req.params.id, owner: req.user._id }
    const leadToCheck = await Lead.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    // If not found: 404 "Lead not found"
    if (!leadToCheck) {
      return errorResponse(res, 'Lead not found', 404);
    }

    const updateData = { ...req.body };
    // Do NOT allow changing the owner field
    delete updateData.owner;

    // Use { new: true, runValidators: true } options
    const updatedLead = await Lead.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user._id,
      },
      updateData,
      { new: true, runValidators: true }
    );

    // Return updated lead
    return successResponse(res, updatedLead, 'Lead updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Update the status of an authorized lead.
 * 
 * Inputs:
 * - req.user._id: ObjectId of the authenticated owner
 * - req.params.id: Lead database identifier
 * - req.body.status: New status value
 * 
 * Outputs:
 * - JSON response with status 200 and the updated lead, or 404 error if missing, or 400 error if validation fails
 * 
 * Side Effects:
 * - Updates the status field of the matched lead document in MongoDB
 * - Logs the request details to console in development
 */
export const updateLeadStatus = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Lead Controller] updateLeadStatus called for ID: ${req.params.id} by user: ${req.user._id}`);
    }

    // Only accepts { status } in body
    const { status } = req.body;

    // Validate status is a valid enum value
    const validStatuses = ['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'];
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(res, 'Status must be: New, Contacted, Meeting Scheduled, Proposal Sent, Won, or Lost', 400);
    }

    // Find and update in one operation: Lead.findOneAndUpdate
    const updatedLead = await Lead.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user._id,
      },
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedLead) {
      return errorResponse(res, 'Lead not found', 404);
    }

    // Return updated lead
    return successResponse(res, updatedLead, 'Lead status updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a lead record after verifying owner authorization.
 * 
 * Inputs:
 * - req.user._id: ObjectId of the authenticated owner
 * - req.params.id: Lead database identifier
 * 
 * Outputs:
 * - JSON response with status 200 indicating successful deletion, or 404 error if missing
 * 
 * Side Effects:
 * - Deletes the lead document from MongoDB
 * - Logs the request details to console in development
 */
export const deleteLead = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Lead Controller] deleteLead called for ID: ${req.params.id} by user: ${req.user._id}`);
    }

    // Find by { _id: req.params.id, owner: req.user._id }
    const lead = await Lead.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    // If not found: 404 "Lead not found"
    if (!lead) {
      return errorResponse(res, 'Lead not found', 404);
    }

    // Delete with lead.deleteOne()
    await lead.deleteOne();

    // Return 200 with { message: 'Lead deleted successfully' }
    return res.status(200).json({ message: 'Lead deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve statistical aggregates of leads (counts by status and conversion rates) for the logged-in user.
 * Outputs stats formatted directly for the Dashboard StatsCard UI.
 * 
 * Inputs:
 * - req.user._id: ObjectId of the authenticated owner
 * 
 * Outputs:
 * - JSON response with statistical summary details
 * 
 * Side Effects:
 * - Logs the request details to console in development
 */
export const getLeadStats = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Lead Controller] getLeadStats called by user: ${req.user._id}`);
    }

    // Use MongoDB aggregation pipeline: Lead.aggregate([])
    // Match: { owner: req.user._id }
    // Group by status to count each
    const stats = await Lead.aggregate([
      { $match: { owner: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Format stats matching what the Dashboard StatsCard expects
    const byStatus = {
      New: 0,
      Contacted: 0,
      'Meeting Scheduled': 0,
      'Proposal Sent': 0,
      Won: 0,
      Lost: 0
    };

    let totalLeads = 0;
    let wonLeads = 0;
    let lostLeads = 0;

    stats.forEach((item) => {
      if (item._id in byStatus) {
        byStatus[item._id] = item.count;
      }
      totalLeads += item.count;
      if (item._id === 'Won') {
        wonLeads = item.count;
      }
      if (item._id === 'Lost') {
        lostLeads = item.count;
      }
    });

    const conversionRate = totalLeads > 0
      ? (wonLeads / totalLeads) * 100
      : 0;

    const formattedStats = {
      totalLeads,
      wonLeads,
      lostLeads,
      conversionRate,
      byStatus
    };

    return successResponse(res, formattedStats, 'Lead stats retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve lead counts and won conversion aggregates grouped monthly for the last 6 months.
 * Outputs stats formatted directly for the Analytics bar chart UI.
 * 
 * Inputs:
 * - req.user._id: ObjectId of the authenticated owner
 * 
 * Outputs:
 * - JSON response with monthly lead statistics array
 * 
 * Side Effects:
 * - Logs the request details to console in development
 */
export const getMonthlyStats = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Lead Controller] getMonthlyStats called by user: ${req.user._id}`);
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyStats = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      monthlyStats.push({
        year: date.getFullYear(),
        monthNum: date.getMonth() + 1,
        month: monthNames[date.getMonth()],
        total: 0,
        won: 0,
      });
    }

    // Aggregate leads grouped by year+month for the last 6 months
    const monthlyData = await Lead.aggregate([
      {
        $match: {
          owner: req.user._id,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
        },
      },
    ]);

    monthlyData.forEach((dbItem) => {
      const match = monthlyStats.find(
        (stat) => stat.year === dbItem._id.year && stat.monthNum === dbItem._id.month
      );
      if (match) {
        match.total = dbItem.total;
        match.won = dbItem.won;
      }
    });

    const finalResponse = monthlyStats.map((stat) => ({
      month: stat.month,
      total: stat.total,
      won: stat.won,
    }));

    return successResponse(res, finalResponse, 'Monthly lead stats retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

