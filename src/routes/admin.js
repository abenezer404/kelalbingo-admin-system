const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { login, verifyOTP, changePassword, requestPasswordChangeOTP, updateActivity, getSessionConfig } = require('../controllers/authController');
const { createUser, listUsers, deleteUser, getStats, updateUserPassword, getPasswordResetLogs } = require('../controllers/userController');
const { getPackages, assignPackage, getUserPackages, getBalanceSyncLogs, getPackageAssignments, adjustBalance, cancelPendingPackage } = require('../controllers/packageController');
const databaseService = require('../services/databaseService');

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

// Device Management routes (admin only)
router.get('/devices', verifyToken, async (req, res) => {
    try {
        const devices = await databaseService.getAuthorizedDevices();
        res.json({
            success: true,
            devices: devices
        });
    } catch (error) {
        console.error('List devices error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

router.post('/devices/add', verifyToken, async (req, res) => {
    try {
        const { deviceSerial, deviceName, licenseType, expiresAt } = req.body;
        
        if (!deviceSerial) {
            return res.status(400).json({
                success: false,
                message: 'Device serial is required'
            });
        }

        // Check if device already exists
        const existing = await databaseService.getAuthorizedDevice(deviceSerial);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Device already authorized'
            });
        }

        const result = await databaseService.addAuthorizedDevice(
            deviceSerial,
            deviceName || 'Unknown Device',
            licenseType || 'standard',
            expiresAt
        );

        res.json({
            success: true,
            message: 'Device authorized successfully',
            deviceId: result.lastID
        });
    } catch (error) {
        console.error('Add device error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

router.delete('/devices/:serial', verifyToken, async (req, res) => {
    try {
        const { serial } = req.params;
        
        const result = await databaseService.removeDevice(serial);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        res.json({
            success: true,
            message: 'Device authorization removed'
        });
    } catch (error) {
        console.error('Remove device error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

router.get('/device-access-logs', verifyToken, async (req, res) => {
    try {
        const logs = await databaseService.getDeviceAccessLogs(100);
        res.json({
            success: true,
            logs: logs
        });
    } catch (error) {
        console.error('Access logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
