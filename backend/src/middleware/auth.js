const { verifyToken } = require('../config/jwt');
const prisma = require('../config/database');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          details: 'No token provided',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          details: 'Token verification failed',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        profilePictureUrl: true,
        isVerified: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          details: 'User associated with token does not exist',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.',
        data: null,
        error: {
          code: 'FORBIDDEN',
          details: 'User account is inactive',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (decoded) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            profilePictureUrl: true,
            isVerified: true,
            isActive: true,
          },
        });

        if (user && user.isActive) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Role-based authorization middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          details: 'User not authenticated',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions.',
        data: null,
        error: {
          code: 'FORBIDDEN',
          details: `Required role: ${roles.join(' or ')}`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
};




