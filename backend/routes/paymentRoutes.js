const express = require('express');
const { createOrder, verifyClientPayment } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.post('/create-order', authenticate, createOrder);
router.post('/verify', authenticate, verifyClientPayment);

module.exports = router;
