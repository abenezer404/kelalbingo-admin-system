const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { login, verifyOTP, changePassword, requestPasswordChangeOTP, updateActivity, getSessionConfig } = require('../controllers/authController');
const { createUser, listUsers, deleteUser, getStats, updateUser, checkUserUpdates, updateUserPassword, getPasswordResetLogs } = require('../controllers/userController');
const { getPackages, assignPackage, getUserPackages, getBalanceSyncLogs, getPackageAssignments, adjustBalance, cancelPendingPackage } = require('../controllers/packageController');
const { db } = require('../config/database');
const databaseService = require('../services/databaseService');

// Public routes
router.post('/login', login);
router.post('/verify-otp', verifyOTP);

// Protected routes (require JWT token)
router.get('/users', verifyToken, listUsers);
router.post('/users/create', verifyToken, createUser);
router.put('/users/:id', verifyToken, updateUser);
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
            SELECT id, name, telegram_id, address, phone, credit_balance, is_active, created_at
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
        const { name, telegramId, initialCredit, address, phone } = req.body;
        if (!name || !telegramId) {
            return res.status(400).json({ success: false, message: 'Name and Telegram ID are required' });
        }
        
        const sql = `INSERT INTO agents (name, telegram_id, address, phone, credit_balance, is_active) VALUES (?, ?, ?, ?, ?, ?)`;
        db.run(sql, [name, telegramId, address ? address.trim() : null, phone ? phone.trim() : null, parseFloat(initialCredit) || 0, true], function(err) {
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

// Update agent information (address and phone)
router.put('/agents/:id', verifyToken, (req, res) => {
    try {
        const { id } = req.params;
        const { address, phone } = req.body;

        // Only address and phone can be updated - name and telegram_id are read-only for security
        const trimmedAddress = address ? address.trim() : null;
        const trimmedPhone = phone ? phone.trim() : null;

        // Try to update both address and phone, with fallback for missing phone column
        const updateWithPhoneSql = 'UPDATE agents SET address = ?, phone = ? WHERE id = ?';
        const updateAddressOnlySql = 'UPDATE agents SET address = ? WHERE id = ?';

        // First try with phone column
        db.run(updateWithPhoneSql, [trimmedAddress, trimmedPhone, id], function(err) {
            if (err && err.message.includes('no such column: phone')) {
                // Phone column doesn't exist, fallback to address only
                console.log('⚠️ Phone column not found in agents table, updating address only');
                
                db.run(updateAddressOnlySql, [trimmedAddress, id], function(fallbackErr) {
                    if (fallbackErr) {
                        console.error('Database error updating agent (fallback):', fallbackErr);
                        return res.status(500).json({
                            success: false,
                            message: 'Database error'
                        });
                    }

                    if (this.changes === 0) {
                        return res.status(404).json({
                            success: false,
                            message: 'Agent not found'
                        });
                    }

                    res.json({
                        success: true,
                        message: 'Agent address updated successfully (phone not supported)'
                    });
                });
            } else if (err) {
                console.error('Database error updating agent:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            } else {
                if (this.changes === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Agent not found'
                    });
                }

                res.json({
                    success: true,
                    message: 'Agent information updated successfully'
                });
            }
        });

    } catch (error) {
        console.error('Update agent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
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

// Deduct agent credit
router.post('/agents/:id/deduct', verifyToken, (req, res) => {
    try {
        const { amount } = req.body;
        const agentId = req.params.id;
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
        }
        
        // First check if agent has enough balance
        db.get('SELECT credit_balance FROM agents WHERE id = ?', [agentId], (err, agent) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
            
            if (agent.credit_balance < amount) {
                return res.status(400).json({ success: false, message: 'Insufficient agent balance' });
            }

            const sql = `UPDATE agents SET credit_balance = credit_balance - ? WHERE id = ?`;
            db.run(sql, [parseFloat(amount), agentId], function(err) {
                if (err) return res.status(500).json({ success: false, message: 'Database error' });
                
                // Log the transaction
                const logSql = `INSERT INTO agent_transactions (agent_id, transaction_type, amount, description) VALUES (?, ?, ?, ?)`;
                db.run(logSql, [agentId, 'deduct', parseFloat(amount), 'Manual deduction by admin'], (logErr) => {
                    if (logErr) console.error('Error logging agent transaction:', logErr);
                });
                
                res.json({ success: true, message: 'Balance deducted successfully' });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get agent transaction logs
router.get('/agents/:id/transactions', verifyToken, (req, res) => {
    try {
        const agentId = req.params.id;
        const sql = `
            SELECT t.*, u.username as target_username
            FROM agent_transactions t
            LEFT JOIN pending_users u ON t.target_user_id = u.id
            WHERE t.agent_id = ?
            ORDER BY t.created_at DESC
            LIMIT 100
        `;
        db.all(sql, [agentId], (err, logs) => {
            if (err) {
                console.error('Error fetching agent logs:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            res.json({ success: true, logs: logs || [] });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
