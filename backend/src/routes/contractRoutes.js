const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validateContractListing } = require('../middleware/validator');
const { uploadMultiple, handleUploadError } = require('../middleware/upload');

// Get listings (public, but can be filtered by auth)
router.get('/listings', optionalAuth, contractController.getListings);

// Protected routes
router.use(authenticate);

router.get('/', contractController.getContracts);
router.get('/:id', contractController.getContractById);
router.post('/listing', validateContractListing, uploadMultiple, handleUploadError, contractController.createListing);
router.post('/:id/request', contractController.requestContract);
router.put('/:id/accept', contractController.acceptContract);
router.put('/:id/reject', contractController.rejectContract);
router.put('/:id/complete', contractController.completeContract);
router.put('/:id/cancel', contractController.cancelContract);

module.exports = router;




