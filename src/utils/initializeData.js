const { db } = require('../config/database');

/**
 * Initialize essential data on startup
 * This ensures critical data is available even after database resets
 */
const initializeEssentialData = () => {
    return new Promise((resolve, reject) => {
        console.log('🔄 Initializing essential data...');
        
        // Initialize default packages
        initializePackages()
            .then(() => initializeDefaultDevices())
            .then(() => {
                console.log('✅ Essential data initialized successfully');
                resolve();
            })
            .catch(reject);
    });
};

/**
 * Initialize default packages
 */
const initializePackages = () => {
    return new Promise((resolve, reject) => {
        // Check if packages exist
        db.get('SELECT COUNT(*) as count FROM packages WHERE is_active = 1', [], (err, row) => {
            if (err) {
                console.error('Error checking packages:', err);
                return reject(err);
            }

            if (row.count === 0) {
                console.log('📦 Creating default packages...');
                
                const defaultPackages = [
                    { name: '100 ብር Package', amount: 100, description: 'Small package for beginners' },
                    { name: '500 ብር Package', amount: 500, description: 'Medium package for regular players' },
                    { name: '1000 ብር Package', amount: 1000, description: 'Large package for active players' },
                    { name: '2000 ብር Package', amount: 2000, description: 'Extra large package for premium players' },
                    { name: '5000 ብር Package', amount: 5000, description: 'Premium package for VIP players' }
                ];
                
                const stmt = db.prepare('INSERT INTO packages (name, amount, description, is_active) VALUES (?, ?, ?, 1)');
                
                let completed = 0;
                defaultPackages.forEach(pkg => {
                    stmt.run(pkg.name, pkg.amount, pkg.description, (err) => {
                        if (err) {
                            console.error('Error creating package:', err);
                        } else {
                            console.log(`✅ Created package: ${pkg.name}`);
                        }
                        
                        completed++;
                        if (completed === defaultPackages.length) {
                            stmt.finalize();
                            resolve();
                        }
                    });
                });
            } else {
                console.log('📦 Packages already exist, skipping creation');
                resolve();
            }
        });
    });
};

/**
 * Initialize default authorized devices from environment variables
 */
const initializeDefaultDevices = () => {
    return new Promise((resolve, reject) => {
        // Get default devices from environment variables
        const defaultDevices = process.env.DEFAULT_AUTHORIZED_DEVICES;
        
        if (!defaultDevices) {
            console.log('🔐 No default devices specified in environment variables');
            return resolve();
        }

        try {
            const devices = JSON.parse(defaultDevices);
            console.log(`🔐 Initializing ${devices.length} default authorized devices...`);
            
            let completed = 0;
            
            devices.forEach(device => {
                // Check if device already exists
                db.get('SELECT id FROM authorized_devices WHERE device_serial = ?', [device.serial], (err, row) => {
                    if (err) {
                        console.error('Error checking device:', err);
                        completed++;
                        if (completed === devices.length) resolve();
                        return;
                    }

                    if (!row) {
                        // Device doesn't exist, create it
                        const sql = `
                            INSERT INTO authorized_devices (device_serial, device_name, license_type, expires_at, is_active)
                            VALUES (?, ?, ?, ?, 1)
                        `;
                        
                        db.run(sql, [
                            device.serial,
                            device.name || 'Default Device',
                            device.licenseType || 'premium',
                            device.expiresAt || null
                        ], (insertErr) => {
                            if (insertErr) {
                                console.error('Error creating device:', insertErr);
                            } else {
                                console.log(`✅ Authorized device: ${device.serial} (${device.name || 'Default Device'})`);
                            }
                            
                            completed++;
                            if (completed === devices.length) resolve();
                        });
                    } else {
                        console.log(`🔐 Device already exists: ${device.serial}`);
                        completed++;
                        if (completed === devices.length) resolve();
                    }
                });
            });
            
        } catch (parseError) {
            console.error('Error parsing DEFAULT_AUTHORIZED_DEVICES:', parseError);
            resolve(); // Don't fail startup for this
        }
    });
};

/**
 * Create sample users for testing (only in development)
 */
const initializeSampleUsers = () => {
    return new Promise((resolve, reject) => {
        if (process.env.NODE_ENV === 'production') {
            return resolve(); // Skip in production
        }

        console.log('👥 Creating sample users for development...');
        
        const sampleUsers = [
            { username: 'testuser1', password_hash: 'test123', machine_serial: 'DEV001' },
            { username: 'testuser2', password_hash: 'test123', machine_serial: 'DEV002' }
        ];
        
        let completed = 0;
        
        sampleUsers.forEach(user => {
            db.get('SELECT id FROM pending_users WHERE username = ? AND machine_serial = ?', 
                [user.username, user.machine_serial], (err, row) => {
                if (err) {
                    console.error('Error checking user:', err);
                    completed++;
                    if (completed === sampleUsers.length) resolve();
                    return;
                }

                if (!row) {
                    const sql = `
                        INSERT INTO pending_users (username, password_hash, machine_serial, is_synced)
                        VALUES (?, ?, ?, 1)
                    `;
                    
                    db.run(sql, [user.username, user.password_hash, user.machine_serial], (insertErr) => {
                        if (insertErr) {
                            console.error('Error creating sample user:', insertErr);
                        } else {
                            console.log(`✅ Created sample user: ${user.username}`);
                        }
                        
                        completed++;
                        if (completed === sampleUsers.length) resolve();
                    });
                } else {
                    console.log(`👥 Sample user already exists: ${user.username}`);
                    completed++;
                    if (completed === sampleUsers.length) resolve();
                }
            });
        });
    });
};

module.exports = {
    initializeEssentialData,
    initializePackages,
    initializeDefaultDevices,
    initializeSampleUsers
};