const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticate } = require('../middleware/auth');
const { validateTransaction } = require('../middleware/validator');

// All routes require authentication
router.use(authenticate);

router.get('/', transactionController.getTransactions);
router.get('/summary', transactionController.getMonthlySummary);
router.post('/', validateTransaction, transactionController.addTransaction);
router.get('/:id', transactionController.getTransactionById);

module.exports = router;




