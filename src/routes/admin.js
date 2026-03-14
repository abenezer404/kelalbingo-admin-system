const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { login, verifyOTP, changePassword, requestPasswordChangeOTP, updateActivity, getSessionConfig } = require('../controllers/authController');
const { createUser, listUsers, deleteUser, getStats, updateUserPassword, getPasswordResetLogs } = require('../controllers/userController');
const { getPackages, assignPackage, getUserPackages, getBalanceSyncLogs, getPackageAssignments, adjustBalance, cancelPendingPackage } = require('../controllers/packageController');

// Public routes
router.post('/login', login);
router.post('/verify-otp', verifyOTP);

// Protected routes (require JWT token)
router.get('/users', verifyToken, listUsers);
router.post('/users/create', verifyToken, createUser);
router.put('/users/:id/password', verifyToken, updateUserPassword);
router.delete('/users/:id', verifyToken, deleteUser);
router.get('/stats', verifyToken, getStats);
router.get('/password-reset-logs', verifyToken, getPasswordResetLogs);

// Password change routes (require authentication)
router.post('/request-password-change-otp', verifyToken, requestPasswordChangeOTP);
router.post('/change-password', verifyToken, changePassword);

// Session management routes
router.post('/update-activity', verifyToken, updateActivity);
router.get('/session-config', getSessionConfig);

// Package routes
router.get('/packages', verifyToken, getPackages);
router.post('/packages/assign', verifyToken, assignPackage);
router.get('/users/:userId/packages', verifyToken, getUserPackages);
router.get('/balance-sync-logs', verifyToken, getBalanceSyncLogs);
router.get('/package-assignments', verifyToken, getPackageAssignments);
router.post('/balance/adjust', verifyToken, adjustBalance);
router.post('/packages/cancel', verifyToken, cancelPendingPackage);

module.exports = router;
