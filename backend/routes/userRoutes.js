const express = require('express');
const { createUser, loginUser, getProfile, ratePeer, getLeaderboard } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.post('/signup', createUser);
router.post('/login', loginUser);
router.get('/profile', authenticate, getProfile);
router.post('/rate', authenticate, ratePeer);
router.get('/leaderboard', authenticate, getLeaderboard);

module.exports = router;
