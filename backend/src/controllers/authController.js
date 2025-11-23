const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');

// Simple in-memory OTP store (in production, use Redis or database)
const otpStore = new Map();

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Register new user
 */
const register = async (req, res, next) => {
  try {
    const { fullName, email, phone, password, role } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email or phone.',
        data: null,
        error: {
          code: 'DUPLICATE_USER',
          details: existingUser.email === email ? 'Email already registered' : 'Phone already registered',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
        role,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const token = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        userId: user.id,
        token,
        refreshToken,
        user,
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * User login
 */
const login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: email ? [{ email }] : [{ phone }],
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          details: 'User not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          details: 'Incorrect password',
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
          code: 'ACCOUNT_DEACTIVATED',
          details: 'Please contact support',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Generate tokens
    const token = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Return user data (excluding sensitive info)
    const userData = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profilePictureUrl: user.profilePictureUrl,
      isVerified: user.isVerified,
    };

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        userId: user.id,
        token,
        refreshToken,
        user: userData,
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send OTP to phone
 */
const sendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Valid phone number is required.',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: 'Phone must be exactly 10 digits',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP (expires in 10 minutes)
    otpStore.set(phone, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // In production, send OTP via SMS gateway (Twilio, AWS SNS, etc.)
    console.log(`OTP for ${phone}: ${otp}`); // Remove in production

    res.json({
      success: true,
      message: 'OTP sent successfully.',
      data: {
        // In production, don't send OTP in response
        // For development/testing only:
        ...(process.env.NODE_ENV === 'development' && { otp }),
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone and OTP are required.',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: 'Missing required fields',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const storedOTP = otpStore.get(phone);

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired.',
        data: null,
        error: {
          code: 'OTP_NOT_FOUND',
          details: 'Please request a new OTP',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({
        success: false,
        message: 'OTP expired.',
        data: null,
        error: {
          code: 'OTP_EXPIRED',
          details: 'Please request a new OTP',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (storedOTP.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP.',
        data: null,
        error: {
          code: 'INVALID_OTP',
          details: 'OTP does not match',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // OTP verified - find or create user
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      // Create user with phone only (they can complete profile later)
      user = await prisma.user.create({
        data: {
          phone,
          fullName: `User ${phone}`,
          email: `${phone}@temp.com`, // Temporary email
          passwordHash: await bcrypt.hash('temp', 10), // Temporary password
          role: 'farmer', // Default role
        },
      });
    }

    // Delete OTP after successful verification
    otpStore.delete(phone);

    // Generate token
    const token = generateAccessToken({ userId: user.id, role: user.role });

    res.json({
      success: true,
      message: 'OTP verified successfully.',
      data: {
        verified: true,
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password - send reset link/OTP
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone is required.',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: 'Missing required field',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: email ? [{ email }] : [{ phone }],
      },
    });

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({
        success: true,
        message: 'If the account exists, a password reset link has been sent.',
        data: null,
        error: null,
        timestamp: new Date().toISOString(),
      });
    }

    // Generate reset token (in production, store in database with expiry)
    const resetToken = generateAccessToken({ userId: user.id, type: 'password_reset' });

    // In production, send email/SMS with reset link
    console.log(`Password reset token for ${email || phone}: ${resetToken}`); // Remove in production

    res.json({
      success: true,
      message: 'Password reset instructions sent.',
      data: {
        // In production, don't send token in response
        ...(process.env.NODE_ENV === 'development' && { resetToken }),
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: 'Missing required fields',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Verify token (in production, verify from database)
    const { verifyToken } = require('../config/jwt');
    const decoded = verifyToken(token);

    if (!decoded || decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.',
        data: null,
        error: {
          code: 'INVALID_TOKEN',
          details: 'Token verification failed',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements.',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: 'Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { passwordHash },
    });

    res.json({
      success: true,
      message: 'Password reset successfully.',
      data: null,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout (client-side token removal, but can track here if needed)
 */
const logout = async (req, res) => {
  // In production, you might want to blacklist the token
  // For now, client should remove token from storage
  res.json({
    success: true,
    message: 'Logged out successfully.',
    data: null,
    error: null,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  register,
  login,
  sendOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  logout,
};

