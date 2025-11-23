const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,webp').split(',');
  const ext = path.extname(file.originalname).toLowerCase().substring(1);

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB default
  },
});

/**
 * Single image upload middleware
 */
const uploadSingle = upload.single('image');

/**
 * Multiple images upload middleware (max 5)
 */
const uploadMultiple = upload.array('images', 5);

/**
 * Error handler for multer
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large.',
        data: null,
        error: {
          code: 'FILE_TOO_LARGE',
          details: `Maximum file size is ${process.env.MAX_FILE_SIZE || 5242880} bytes (5MB)`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files.',
        data: null,
        error: {
          code: 'TOO_MANY_FILES',
          details: 'Maximum 5 images allowed per listing',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(400).json({
      success: false,
      message: 'File upload error.',
      data: null,
      error: {
        code: 'UPLOAD_ERROR',
        details: err.message,
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: 'File upload error.',
      data: null,
      error: {
        code: 'UPLOAD_ERROR',
        details: err.message,
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  handleUploadError,
};




