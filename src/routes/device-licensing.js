const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');

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
 * Test endpoint for debugging
 */
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Device licensing API is working',
        timestamp: new Date().toISOString()
    });
});

/**
 * Validate device authorization
 */
router.post('/validate-device', validateApiKey, async (req, res) => {
    try {
        const { deviceSerial, appVersion } = req.body;
        
        console.log(`🔍 Device validation request: ${deviceSerial}`);
        
        if (!deviceSerial) {
            return res.status(400).json({
                success: false,
                message: 'Device serial is required'
            });
        }

        // Initialize database service if not already done
        if (!databaseService.initialized) {
            console.log('🔄 Initializing database service...');
            await databaseService.init();
        }

        // Check if device is authorized
        console.log(`🔍 Checking device authorization for: ${deviceSerial}`);
        const device = await databaseService.getAuthorizedDevice(deviceSerial);
        console.log(`📋 Device query result:`, device);

        if (!device) {
            // Log unauthorized access attempt
            console.log(`❌ Device not authorized: ${deviceSerial}`);
            await databaseService.logDeviceAccess(deviceSerial, null, false, 'Device not authorized');
            
            return res.json({
                success: true,
                authorized: false,
                message: 'Device not authorized'
            });
        }

        // Check if license is expired
        if (device.expires_at && new Date() > new Date(device.expires_at)) {
            console.log(`⏰ License expired for device: ${deviceSerial}`);
            return res.json({
                success: true,
                authorized: false,
                message: 'License expired'
            });
        }

        // Update device access
        console.log(`✅ Updating device access for: ${deviceSerial}`);
        await databaseService.updateDeviceAccess(deviceSerial, null);

        // Log successful access
        await databaseService.logDeviceAccess(deviceSerial, null, true, 'Access granted');

        console.log(`🎉 Device authorized successfully: ${deviceSerial}`);

        // Return authorization success
        res.json({
            success: true,
            authorized: true,
            message: 'Device authorized',
            expiresAt: device.expires_at,
            licenseType: device.license_type || 'standard',
            deviceName: device.device_name
        });
    } catch (error) {
        console.error('💥 Device validation error:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Add authorized device (admin only)
 */
router.post('/add-device', validateApiKey, async (req, res) => {
    try {
        const { deviceSerial, deviceName, licenseType, expiresAt } = req.body;
        
        if (!deviceSerial) {
            return res.status(400).json({
                success: false,
                message: 'Device serial is required'
            });
        }

        // Check if device already exists
        const existingDevice = await databaseService.getAuthorizedDevice(deviceSerial);
        if (existingDevice) {
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
            deviceId: result.lastID || result.insertId
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
router.delete('/remove-device/:serial', validateApiKey, async (req, res) => {
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

/**
 * List authorized devices (admin only)
 */
router.get('/devices', validateApiKey, async (req, res) => {
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

/**
 * Get device access logs (admin only)
 */
router.get('/access-logs', validateApiKey, async (req, res) => {
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

/**
 * Log device access attempts - removed as it's now handled by databaseService
 */

module.exports = router;