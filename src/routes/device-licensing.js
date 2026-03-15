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
 * Debug validation endpoint - step by step testing
 */
router.post('/debug-validate', validateApiKey, async (req, res) => {
    const steps = [];
    
    try {
        const { deviceSerial } = req.body;
        steps.push('1. Received request');
        
        if (!deviceSerial) {
            return res.status(400).json({
                success: false,
                message: 'Device serial is required',
                steps
            });
        }
        steps.push('2. Device serial validated');

        // Test database service initialization
        try {
            if (!databaseService.initialized) {
                steps.push('3. Initializing database service...');
                await databaseService.init();
                steps.push('4. Database service initialized');
            } else {
                steps.push('3. Database service already initialized');
            }
        } catch (initError) {
            steps.push(`3. Database init failed: ${initError.message}`);
            return res.status(500).json({
                success: false,
                message: 'Database initialization failed',
                error: initError.message,
                steps
            });
        }

        // Test device query
        try {
            steps.push('4. Querying device...');
            const device = await databaseService.getAuthorizedDevice(deviceSerial);
            steps.push(`5. Device query result: ${device ? 'found' : 'not found'}`);
            
            if (device) {
                // Test updateDeviceAccess
                try {
                    steps.push('6. Testing updateDeviceAccess...');
                    await databaseService.updateDeviceAccess(deviceSerial, null);
                    steps.push('7. updateDeviceAccess successful');
                } catch (updateError) {
                    steps.push(`6. updateDeviceAccess failed: ${updateError.message}`);
                    return res.status(500).json({
                        success: false,
                        message: 'updateDeviceAccess failed',
                        error: updateError.message,
                        steps
                    });
                }

                // Test logDeviceAccess
                try {
                    steps.push('8. Testing logDeviceAccess...');
                    await databaseService.logDeviceAccess(deviceSerial, null, true, 'Debug test access');
                    steps.push('9. logDeviceAccess successful');
                } catch (logError) {
                    steps.push(`8. logDeviceAccess failed: ${logError.message}`);
                    return res.status(500).json({
                        success: false,
                        message: 'logDeviceAccess failed',
                        error: logError.message,
                        steps
                    });
                }
            }
            
            return res.json({
                success: true,
                message: 'Debug validation completed',
                deviceFound: !!device,
                device: device,
                steps
            });
        } catch (queryError) {
            steps.push(`4. Device query failed: ${queryError.message}`);
            return res.status(500).json({
                success: false,
                message: 'Device query failed',
                error: queryError.message,
                steps
            });
        }

    } catch (error) {
        steps.push(`Error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Debug validation failed',
            error: error.message,
            steps
        });
    }
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