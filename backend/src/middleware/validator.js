/**
 * Validation middleware for request data
 */

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
};

const validatePassword = (password) => {
  // Min 8 chars, 1 uppercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const validateFullName = (name) => {
  // 2-100 characters, letters and spaces only
  const nameRegex = /^[a-zA-Z\s]{2,100}$/;
  return nameRegex.test(name);
};

/**
 * Validate registration data
 */
const validateRegister = (req, res, next) => {
  const { fullName, email, phone, password, role } = req.body;
  const errors = [];

  if (!fullName || !validateFullName(fullName)) {
    errors.push('Full name must be 2-100 characters and contain only letters and spaces');
  }

  if (!email || !validateEmail(email)) {
    errors.push('Valid email is required');
  }

  if (!phone || !validatePhone(phone)) {
    errors.push('Phone must be exactly 10 digits');
  }

  if (!password || !validatePassword(password)) {
    errors.push('Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character');
  }

  if (!role || !['farmer', 'buyer'].includes(role)) {
    errors.push('Role must be either "farmer" or "buyer"');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        details: errors.join('; '),
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Validate login data
 */
const validateLogin = (req, res, next) => {
  const { email, phone, password } = req.body;
  const errors = [];

  if (!password) {
    errors.push('Password is required');
  }

  if (!email && !phone) {
    errors.push('Either email or phone is required');
  }

  if (email && !validateEmail(email)) {
    errors.push('Valid email is required');
  }

  if (phone && !validatePhone(phone)) {
    errors.push('Phone must be exactly 10 digits');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        details: errors.join('; '),
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Validate contract listing data
 */
const validateContractListing = (req, res, next) => {
  const { cropType, quantity, unit, expectedPrice } = req.body;
  const errors = [];

  if (!cropType || cropType.trim().length === 0) {
    errors.push('Crop type is required');
  }

  if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
    errors.push('Quantity must be a positive number');
  }

  if (quantity && parseFloat(quantity) > 10000) {
    errors.push('Quantity cannot exceed 10000');
  }

  if (!unit || unit.trim().length === 0) {
    errors.push('Unit is required');
  }

  if (!expectedPrice || isNaN(expectedPrice) || parseFloat(expectedPrice) <= 0) {
    errors.push('Expected price must be a positive number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        details: errors.join('; '),
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Validate transaction data
 */
const validateTransaction = (req, res, next) => {
  const { type, amount, transactionDate } = req.body;
  const errors = [];

  if (!type || !['income', 'expense'].includes(type)) {
    errors.push('Type must be either "income" or "expense"');
  }

  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    errors.push('Amount must be a positive number');
  }

  if (transactionDate) {
    const date = new Date(transactionDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (isNaN(date.getTime())) {
      errors.push('Invalid transaction date');
    } else if (date > today) {
      errors.push('Transaction date cannot be in the future');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        details: errors.join('; '),
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateContractListing,
  validateTransaction,
  validateEmail,
  validatePhone,
  validatePassword,
  validateFullName,
};




