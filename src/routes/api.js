const express = require('express');
const router = express.Router();
const validateApiKey = require('../middleware/apiKey');
const { syncUser, resetPassword, checkUserUpdates } = require('../controllers/userController');
const { syncBalance, reportBalance } = require('../controllers/packageController');

// Desktop app routes (require API key)
router.post('/sync-user', validateApiKey, syncUser);
router.post('/check-user-updates', validateApiKey, checkUserUpdates);
router.post('/reset-password', validateApiKey, resetPassword);
router.post('/sync-balance', validateApiKey, syncBalance);
router.post('/report-balance', validateApiKey, reportBalance);

module.exports = router;
