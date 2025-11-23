/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry. This record already exists.',
      data: null,
      error: {
        code: 'DUPLICATE_ENTRY',
        details: err.meta?.target ? `Duplicate value for: ${err.meta.target.join(', ')}` : 'Unique constraint violation',
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found.',
      data: null,
      error: {
        code: 'NOT_FOUND',
        details: 'The requested resource does not exist',
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Validation errors
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error.',
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        details: err.message,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
      data: null,
      error: {
        code: 'INVALID_TOKEN',
        details: 'Token verification failed',
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired.',
      data: null,
      error: {
        code: 'TOKEN_EXPIRED',
        details: 'Please login again',
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error.';

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.stack : 'An unexpected error occurred',
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
    data: null,
    error: {
      code: 'NOT_FOUND',
      details: `The endpoint ${req.method} ${req.path} does not exist`,
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};




