const prisma = require('../config/database');

/**
 * Get all contracts with filters
 */
const getContracts = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    // Filter by status
    if (status && ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      where.status = status;
    }

    // Filter by user role
    if (type === 'my_listings' && userRole === 'farmer') {
      where.farmerId = userId;
    } else if (type === 'my_requests' && userRole === 'buyer') {
      where.buyerId = userId;
    } else {
      // Default: show contracts where user is involved
      where.OR = [
        { farmerId: userId },
        { buyerId: userId },
      ];
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            include: {
              location: true,
            },
          },
          farmer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              profilePictureUrl: true,
            },
          },
          buyer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              profilePictureUrl: true,
            },
          },
        },
      }),
      prisma.contract.count({ where }),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      message: 'Contracts retrieved successfully.',
      data: contracts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNext: parseInt(page) < totalPages,
        hasPrevious: parseInt(page) > 1,
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get contract by ID
 */
const getContractById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        OR: [
          { farmerId: userId },
          { buyerId: userId },
        ],
      },
      include: {
        listing: {
          include: {
            location: true,
            farmer: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                profilePictureUrl: true,
              },
            },
          },
        },
        farmer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            profilePictureUrl: true,
          },
        },
        buyer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            profilePictureUrl: true,
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found.',
        data: null,
        error: {
          code: 'NOT_FOUND',
          details: 'Contract does not exist or you do not have access',
        },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Contract retrieved successfully.',
      data: contract,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create contract listing (farmer only)
 */
const createListing = async (req, res, next) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({
        success: false,
        message: 'Only farmers can create listings.',
        data: null,
        error: {
          code: 'FORBIDDEN',
          details: 'This action is restricted to farmers',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const {
      cropType,
      quantity,
      unit,
      expectedPrice,
      description,
      harvestDate,
      locationId,
    } = req.body;

    // Handle images from file upload
    let images = null;
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/${file.filename}`);
    }

    const listing = await prisma.contractListing.create({
      data: {
        farmerId: req.user.id,
        cropType,
        quantity: parseFloat(quantity),
        unit,
        expectedPrice: parseFloat(expectedPrice),
        description,
        harvestDate: harvestDate ? new Date(harvestDate) : null,
        images: images ? images : null,
        locationId: locationId || null,
        status: 'active',
      },
      include: {
        location: true,
        farmer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            profilePictureUrl: true,
          },
        },
      },
    });

    // Images are already parsed by Prisma

    res.status(201).json({
      success: true,
      message: 'Listing created successfully.',
      data: listing,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available listings
 */
const getListings = async (req, res, next) => {
  try {
    const { crop, location, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      status: 'active', // Only show active listings
    };

    if (crop) {
      where.cropType = {
        contains: crop,
        mode: 'insensitive',
      };
    }

    if (location) {
      where.location = {
        OR: [
          { city: { contains: location, mode: 'insensitive' } },
          { state: { contains: location, mode: 'insensitive' } },
          { pincode: { contains: location } },
        ],
      };
    }

    const [listings, total] = await Promise.all([
      prisma.contractListing.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          location: true,
          farmer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              profilePictureUrl: true,
            },
          },
        },
      }),
      prisma.contractListing.count({ where }),
    ]);

    // Images are already parsed by Prisma

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      message: 'Listings retrieved successfully.',
      data: listings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNext: parseInt(page) < totalPages,
        hasPrevious: parseInt(page) > 1,
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request contract (buyer)
 */
const requestContract = async (req, res, next) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({
        success: false,
        message: 'Only buyers can request contracts.',
        data: null,
        error: {
          code: 'FORBIDDEN',
          details: 'This action is restricted to buyers',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = req.params;
    const { message, terms } = req.body;

    // Get listing
    const listing = await prisma.contractListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
        data: null,
        error: {
          code: 'NOT_FOUND',
          details: 'Listing does not exist',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Listing is not available.',
        data: null,
        error: {
          code: 'LISTING_UNAVAILABLE',
          details: `Listing status is ${listing.status}`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (listing.farmerId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot request your own listing.',
        data: null,
        error: {
          code: 'INVALID_REQUEST',
          details: 'You cannot request a contract for your own listing',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Create contract request
    const contract = await prisma.contract.create({
      data: {
        listingId: listing.id,
        farmerId: listing.farmerId,
        buyerId: req.user.id,
        cropType: listing.cropType,
        quantity: listing.quantity,
        agreedPrice: listing.expectedPrice, // Initial price, can be negotiated
        totalAmount: listing.quantity * listing.expectedPrice,
        status: 'requested',
        terms: terms || message,
      },
      include: {
        listing: true,
        farmer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        buyer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Contract request created successfully.',
      data: contract,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept contract (farmer)
 */
const acceptContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { requestId } = req.body;

    const contract = await prisma.contract.findFirst({
      where: {
        id: requestId || id,
        farmerId: req.user.id,
        status: 'requested',
      },
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract request not found.',
        data: null,
        error: {
          code: 'NOT_FOUND',
          details: 'Contract does not exist or is not in requested status',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Update contract status
    const updatedContract = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: 'accepted',
      },
      include: {
        listing: true,
        farmer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        buyer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    // Update listing status
    await prisma.contractListing.update({
      where: { id: contract.listingId },
      data: { status: 'contracted' },
    });

    res.json({
      success: true,
      message: 'Contract accepted successfully.',
      data: updatedContract,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject contract
 */
const rejectContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        OR: [
          { farmerId: req.user.id },
          { buyerId: req.user.id },
        ],
        status: { in: ['requested', 'accepted'] },
      },
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found.',
        data: null,
        error: {
          code: 'NOT_FOUND',
          details: 'Contract does not exist or cannot be rejected',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Update contract status
    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: 'cancelled',
        terms: reason ? `${contract.terms || ''}\nRejection reason: ${reason}` : contract.terms,
      },
    });

    // If contract was accepted, make listing active again
    if (contract.status === 'accepted') {
      await prisma.contractListing.update({
        where: { id: contract.listingId },
        data: { status: 'active' },
      });
    }

    res.json({
      success: true,
      message: 'Contract rejected successfully.',
      data: null,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete contract
 */
const completeContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deliveryProof } = req.body;

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        OR: [
          { farmerId: req.user.id },
          { buyerId: req.user.id },
        ],
        status: { in: ['accepted', 'in_progress'] },
      },
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found.',
        data: null,
        error: {
          code: 'NOT_FOUND',
          details: 'Contract does not exist or cannot be completed',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Update contract status
    const updatedContract = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        terms: deliveryProof ? `${contract.terms || ''}\nDelivery proof: ${deliveryProof}` : contract.terms,
      },
      include: {
        listing: true,
        farmer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        buyer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    // Update listing status
    await prisma.contractListing.update({
      where: { id: contract.listingId },
      data: { status: 'completed' },
    });

    // Create transaction for farmer (income)
    await prisma.transaction.create({
      data: {
        userId: contract.farmerId,
        type: 'income',
        category: 'sale',
        amount: contract.totalAmount,
        description: `Sale of ${contract.cropType} - Contract ${contract.id}`,
        referenceId: contract.id,
        referenceType: 'contract',
        transactionDate: new Date(),
      },
    });

    // Create transaction for buyer (expense)
    await prisma.transaction.create({
      data: {
        userId: contract.buyerId,
        type: 'expense',
        category: 'purchase',
        amount: contract.totalAmount,
        description: `Purchase of ${contract.cropType} - Contract ${contract.id}`,
        referenceId: contract.id,
        referenceType: 'contract',
        transactionDate: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Contract completed successfully.',
      data: updatedContract,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel contract
 */
const cancelContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        OR: [
          { farmerId: req.user.id },
          { buyerId: req.user.id },
        ],
        status: { not: 'completed' },
      },
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found.',
        data: null,
        error: {
          code: 'NOT_FOUND',
          details: 'Contract does not exist or cannot be cancelled',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Update contract status
    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: 'cancelled',
        terms: reason ? `${contract.terms || ''}\nCancellation reason: ${reason}` : contract.terms,
      },
    });

    // Make listing active again if it was contracted
    const listing = await prisma.contractListing.findUnique({
      where: { id: contract.listingId },
    });

    if (listing && listing.status === 'contracted') {
      await prisma.contractListing.update({
        where: { id: contract.listingId },
        data: { status: 'active' },
      });
    }

    res.json({
      success: true,
      message: 'Contract cancelled successfully.',
      data: null,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContracts,
  getContractById,
  createListing,
  getListings,
  requestContract,
  acceptContract,
  rejectContract,
  completeContract,
  cancelContract,
};

