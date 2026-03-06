const express = require('express');
const { analyzeResume, upload } = require('../controllers/resumeController');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.post('/analyze-resume', authenticate, upload.single('resume'), analyzeResume);

module.exports = router;
