const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

/**
 * Device Licensing API Routes
 * Manages authorized devices for desktop application
 */

// Middleware to validate API key
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.API_KEY || 'kelalbingo-secret-key-2026-secure';
    
    if (apiKey !== expectedKey) {
        return res.status(401).json({
            success: false,
            message: 'Invalid API key'
        });
    }
    
    next();
};

/**
 * Validate device authorization
 */
router.post('/validate-device', validateApiKey, (req, res) => {
    try {
        const { deviceSerial, appVersion } = req.body;
        
        if (!deviceSerial) {
            return res.status(400).json({
                success: false,
                message: 'Device serial is required'
            });
        }

        // Check if device is authorized
        const sql = `
            SELECT * FROM authorized_devices 
            WHERE device_serial = ? AND is_active = 1
        `;
        
        db.get(sql, [deviceSerial], (err, device) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (!device) {
                // Log unauthorized access attempt
                logDeviceAccess(deviceSerial, null, false, 'Device not authorized');
                
                return res.json({
                    success: true,
                    authorized: false,
                    message: 'Device not authorized'
                });
            }

            // Check if license is expired
            if (device.expires_at && new Date() > new Date(device.expires_at)) {
                return res.json({
                    success: true,
                    authorized: false,
                    message: 'License expired'
                });
            }

            // Update last access
            const updateSql = `
                UPDATE authorized_devices 
                SET last_access = CURRENT_TIMESTAMP, access_count = access_count + 1
                WHERE device_serial = ?
            `;
            
            db.run(updateSql, [deviceSerial], (updateErr) => {
                if (updateErr) {
                    console.error('Failed to update device access:', updateErr);
                }
            });

            // Log successful access
            logDeviceAccess(deviceSerial, null, true, 'Access granted');

            // Return authorization success
            res.json({
                success: true,
                authorized: true,
                message: 'Device authorized',
                expiresAt: device.expires_at,
                licenseType: device.license_type || 'standard',
                deviceName: device.device_name
            });
        });
    } catch (error) {
        console.error('Device validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * Add authorized device (admin only)
 */
router.post('/add-device', validateApiKey, (req, res) => {
    try {
        const { deviceSerial, deviceName, licenseType, expiresAt } = req.body;
        
        if (!deviceSerial) {
            return res.status(400).json({
                success: false,
                message: 'Device serial is required'
            });
        }

        const sql = `
            INSERT INTO authorized_devices (device_serial, device_name, license_type, expires_at, created_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        db.run(sql, [deviceSerial, deviceName || 'Unknown Device', licenseType || 'standard', expiresAt], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
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

/**
 * Remove device authorization (admin only)
 */
router.delete('/remove-device/:serial', validateApiKey, (req, res) => {
    try {
        const { serial } = req.params;
        
        const sql = `UPDATE authorized_devices SET is_active = 0 WHERE device_serial = ?`;
        
        db.run(sql, [serial], function(err) {
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

/**
 * List authorized devices (admin only)
 */
router.get('/devices', validateApiKey, (req, res) => {
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
                devices: devices
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

/**
 * Get device access logs (admin only)
 */
router.get('/access-logs', validateApiKey, (req, res) => {
    try {
        const sql = `
            SELECT device_serial, device_fingerprint, success, message, accessed_at
            FROM device_access_logs 
            ORDER BY accessed_at DESC 
            LIMIT 100
        `;
        
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
                logs: logs
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

/**
 * Log device access attempts
 */
function logDeviceAccess(deviceSerial, deviceFingerprint, success, message) {
    const sql = `
        INSERT INTO device_access_logs (device_serial, device_fingerprint, success, message, accessed_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    db.run(sql, [deviceSerial, deviceFingerprint || null, success ? 1 : 0, message], (err) => {
        if (err) {
            console.error('Failed to log device access:', err);
        }
    });
}

module.exports = router;