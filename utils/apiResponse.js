/**
 * Send a standardized success JSON response.
 * @param {Object} res - Express response object
 * @param {*} data - Dynamic payload to send
 * @param {string} message - Success message description
 * @param {number} [statusCode=200] - HTTP status code
 */
export const successResponse = (res, data, message, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send a standardized error JSON response.
 * @param {Object} res - Express response object
 * @param {string} message - Error message description
 * @param {number} [statusCode=500] - HTTP status code
 * @param {*} [errors=null] - Dynamic payload for detailed validation or custom errors
 */
export const errorResponse = (res, message, statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

/**
 * Send a standardized paginated success JSON response.
 * @param {Object} res - Express response object
 * @param {Array} data - Array of paginated records
 * @param {number} total - Total count of records in db
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 */
export const paginatedResponse = (res, data, total, page, limit) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
};

