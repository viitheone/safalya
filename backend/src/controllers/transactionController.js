const prisma = require('../config/database');

/**
 * Get all transactions with filters
 */
const getTransactions = async (req, res, next) => {
  try {
    const { month, year, type, page = 1, limit = 10 } = req.query;
    const userId = req.user.id;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { userId };

    // Filter by type
    if (type && ['income', 'expense'].includes(type)) {
      where.type = type;
    }

    // Filter by month and year
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      where.transactionDate = {
        gte: startDate,
        lte: endDate,
      };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);

      where.transactionDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { transactionDate: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      message: 'Transactions retrieved successfully.',
      data: transactions,
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
 * Get monthly summary
 */
const getMonthlySummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const userId = req.user.id;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required.',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: 'Please provide both month and year',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate summary
    let income = 0;
    let expenses = 0;

    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount);
      if (transaction.type === 'income') {
        income += amount;
      } else {
        expenses += amount;
      }
    });

    const net = income - expenses;

    res.json({
      success: true,
      message: 'Monthly summary retrieved successfully.',
      data: {
        income,
        expenses,
        net,
        transactionCount: transactions.length,
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add manual transaction
 */
const addTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, description, transactionDate } = req.body;

    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction type.',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: 'Type must be either "income" or "expense"',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount.',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: 'Amount must be a positive number',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate date
    let date = transactionDate ? new Date(transactionDate) : new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction date.',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: 'Please provide a valid date',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (date > today) {
      return res.status(400).json({
        success: false,
        message: 'Transaction date cannot be in the future.',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: 'Date cannot be in the future',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: req.user.id,
        type,
        category: category || 'other',
        amount: parseFloat(amount),
        description,
        transactionDate: date,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Transaction added successfully.',
      data: transaction,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction by ID
 */
const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
        data: null,
        error: {
          code: 'NOT_FOUND',
          details: 'Transaction does not exist or you do not have access',
        },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Transaction retrieved successfully.',
      data: transaction,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  getMonthlySummary,
  addTransaction,
  getTransactionById,
};




