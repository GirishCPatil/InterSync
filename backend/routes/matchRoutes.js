const express = require('express');
const { findMatch } = require('../controllers/matchController');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.post('/match', authenticate, findMatch);

module.exports = router;
