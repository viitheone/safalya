const prisma = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Get user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        profilePictureUrl: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      include: {
        locations: true, // Single location due to unique constraint
        bankDetails: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        data: null,
        error: {
          code: 'NOT_FOUND',
          details: 'User does not exist',
        },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully.',
      data: user,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { fullName, email, phone } = req.body;
    const updateData = {};

    if (fullName) {
      const nameRegex = /^[a-zA-Z\s]{2,100}$/;
      if (!nameRegex.test(fullName)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid full name.',
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            details: 'Full name must be 2-100 characters and contain only letters and spaces',
          },
          timestamp: new Date().toISOString(),
        });
      }
      updateData.fullName = fullName;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format.',
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            details: 'Please provide a valid email address',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Check if email already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: req.user.id },
        },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use.',
          data: null,
          error: {
            code: 'DUPLICATE_EMAIL',
            details: 'This email is already registered',
          },
          timestamp: new Date().toISOString(),
        });
      }

      updateData.email = email;
    }

    if (phone) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number.',
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            details: 'Phone must be exactly 10 digits',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Check if phone already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: req.user.id },
        },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Phone number already in use.',
          data: null,
          error: {
            code: 'DUPLICATE_PHONE',
            details: 'This phone number is already registered',
          },
          timestamp: new Date().toISOString(),
        });
      }

      updateData.phone = phone;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update.',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: 'Please provide at least one field to update',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        profilePictureUrl: true,
        isVerified: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: updatedUser,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload profile picture
 */
const uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded.',
        data: null,
        error: {
          code: 'NO_FILE',
          details: 'Please upload an image file',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // In production, upload to cloud storage (AWS S3, Cloudinary, etc.)
    // For now, return local file path
    const imageUrl = `/uploads/${req.file.filename}`;

    // Update user profile picture
    await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePictureUrl: imageUrl },
    });

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully.',
      data: {
        imageUrl,
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user location
 */
const updateLocation = async (req, res, next) => {
  try {
    const { lat, lng, address, city, state, pincode } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required.',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: 'Please provide location coordinates',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Create or update location
    const location = await prisma.userLocation.upsert({
      where: {
        userId: req.user.id,
      },
      update: {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        address,
        city,
        state,
        pincode,
      },
      create: {
        userId: req.user.id,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        address,
        city,
        state,
        pincode,
      },
    });

    res.json({
      success: true,
      message: 'Location updated successfully.',
      data: location,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update bank details
 */
const updateBankDetails = async (req, res, next) => {
  try {
    const { accountNo, ifsc, bankName, accountHolderName, upiId } = req.body;

    if (!accountNo || !ifsc || !bankName || !accountHolderName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required bank details.',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: 'Account number, IFSC code, bank name, and account holder name are required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Encrypt account number (in production, use proper encryption)
    // For now, storing as-is (should be encrypted in production)
    const bankDetails = await prisma.bankDetails.upsert({
      where: {
        userId: req.user.id,
      },
      update: {
        accountNumber: accountNo,
        ifscCode: ifsc,
        bankName,
        accountHolderName,
        upiId,
      },
      create: {
        userId: req.user.id,
        accountNumber: accountNo,
        ifscCode: ifsc,
        bankName,
        accountHolderName,
        upiId,
      },
    });

    res.json({
      success: true,
      message: 'Bank details updated successfully.',
      data: {
        id: bankDetails.id,
        bankName: bankDetails.bankName,
        accountHolderName: bankDetails.accountHolderName,
        ifscCode: bankDetails.ifscCode,
        upiId: bankDetails.upiId,
        isVerified: bankDetails.isVerified,
        // Don't return account number for security
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account
 */
const deleteAccount = async (req, res, next) => {
  try {
    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id: req.user.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Account deleted successfully.',
      data: null,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePicture,
  updateLocation,
  updateBankDetails,
  deleteAccount,
};

