const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { login, verifyOTP, changePassword, requestPasswordChangeOTP, updateActivity, getSessionConfig } = require('../controllers/authController');
const { createUser, listUsers, deleteUser, getStats, updateUserPassword, getPasswordResetLogs } = require('../controllers/userController');
const { getPackages, assignPackage, getUserPackages, getBalanceSyncLogs, getPackageAssignments, adjustBalance, cancelPendingPackage } = require('../controllers/packageController');
const { db } = require('../config/database');
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
router.get('/devices', verifyToken, (req, res) => {
    try {
        const sql = `
            SELECT device_serial, device_name, device_fingerprint, license_type, 
                   expires_at, created_at, last_access, access_count, is_active
            FROM authorized_devices 
            ORDER BY created_at DESC
        `;
        
        db.all(sql, [], (err, devices) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            res.json({
                success: true,
                devices: devices || []
            });
        });
    } catch (error) {
        console.error('List devices error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

router.post('/devices/add', verifyToken, (req, res) => {
    try {
        const { deviceSerial, deviceName, licenseType, expiresAt } = req.body;
        
        if (!deviceSerial) {
            return res.status(400).json({
                success: false,
                message: 'Device serial is required'
            });
        }

        const sql = `
            INSERT INTO authorized_devices (device_serial, device_name, license_type, expires_at, created_at, is_active)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        `;
        
        db.run(sql, [deviceSerial, deviceName || 'Unknown Device', licenseType || 'standard', expiresAt, true], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT' || err.code === '23505') { // PostgreSQL unique violation
                    return res.status(400).json({
                        success: false,
                        message: 'Device already authorized'
                    });
                }
                
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            res.json({
                success: true,
                message: 'Device authorized successfully',
                deviceId: this.lastID
            });
        });
    } catch (error) {
        console.error('Add device error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

router.delete('/devices/:serial', verifyToken, (req, res) => {
    try {
        const { serial } = req.params;
        
        const sql = `UPDATE authorized_devices SET is_active = ? WHERE device_serial = ?`;
        
        db.run(sql, [false, serial], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found'
                });
            }

            res.json({
                success: true,
                message: 'Device authorization removed'
            });
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
        // Use direct database query for compatibility
        const sql = `
            SELECT device_serial, device_fingerprint, success, message, accessed_at
            FROM device_access_logs 
            ORDER BY accessed_at DESC 
            LIMIT 100
        `;
        
        // Use callback-style query for compatibility with our database wrapper
        db.all(sql, [], (err, logs) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            res.json({
                success: true,
                logs: logs || []
            });
        });
    } catch (error) {
        console.error('Access logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Agent Management routes
router.get('/agents', verifyToken, (req, res) => {
    try {
        const sql = `
            SELECT id, name, telegram_id, credit_balance, is_active, created_at
            FROM agents 
            ORDER BY created_at DESC
        `;
        db.all(sql, [], (err, agents) => {
            if (err) {
                console.error('Database error in /agents:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            res.json({ success: true, agents: agents || [] });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/agents/add', verifyToken, (req, res) => {
    try {
        const { name, telegramId, initialCredit } = req.body;
        if (!name || !telegramId) {
            return res.status(400).json({ success: false, message: 'Name and Telegram ID are required' });
        }
        
        const sql = `INSERT INTO agents (name, telegram_id, credit_balance, is_active) VALUES (?, ?, ?, ?)`;
        db.run(sql, [name, telegramId, parseFloat(initialCredit) || 0, true], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT' || err.code === '23505') {
                    return res.status(400).json({ success: false, message: 'Agent with this Telegram ID already exists' });
                }
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            res.json({ success: true, message: 'Agent added successfully', agentId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/agents/:id/fund', verifyToken, (req, res) => {
    try {
        const { amount } = req.body;
        const agentId = req.params.id;
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ success: false, message: 'Valid amount is required' });
        }
        
        const sql = `UPDATE agents SET credit_balance = credit_balance + ? WHERE id = ?`;
        db.run(sql, [parseFloat(amount), agentId], function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            
            // Log the transaction
            const logSql = `INSERT INTO agent_transactions (agent_id, transaction_type, amount, description) VALUES (?, ?, ?, ?)`;
            db.run(logSql, [agentId, 'fund', parseFloat(amount), 'Manual funding by admin'], (logErr) => {
                if (logErr) console.error('Error logging agent transaction:', logErr);
            });
            
            res.json({ success: true, message: 'Agent funded successfully' });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
