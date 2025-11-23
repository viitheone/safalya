const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { uploadSingle, handleUploadError } = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/profile-picture', uploadSingle, handleUploadError, userController.uploadProfilePicture);
router.put('/location', userController.updateLocation);
router.put('/bank-details', userController.updateBankDetails);
router.delete('/account', userController.deleteAccount);

module.exports = router;




