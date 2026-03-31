const { db } = require('./src/config/database');

/**
 * Migration script to update old "Bot Agent" packages with proper agent names
 * This script finds packages assigned by "Bot Agent" and tries to match them
 * with the actual agent based on transaction logs
 */

async function migrateBotAgentPackages() {
    console.log('🔄 Starting migration of Bot Agent packages...');
    
    try {
        // Find all packages with "Bot Agent" assigned_by
        const sql = `
            SELECT up.id, up.user_id, up.amount, up.created_at
            FROM user_packages up
            WHERE up.assigned_by = 'Bot Agent'
            ORDER BY up.created_at DESC
        `;
        
        db.all(sql, [], async (err, packages) => {
            if (err) {
                console.error('❌ Error fetching Bot Agent packages:', err);
                return;
            }
            
            if (packages.length === 0) {
                console.log('✅ No Bot Agent packages found to migrate');
                return;
            }
            
            console.log(`📦 Found ${packages.length} Bot Agent packages to migrate`);
            
            let migratedCount = 0;
            let skippedCount = 0;
            
            for (const pkg of packages) {
                try {
                    // Try to find the corresponding agent transaction
                    const transactionSql = `
                        SELECT at.agent_id, a.name as agent_name
                        FROM agent_transactions at
                        JOIN agents a ON at.agent_id = a.id
                        WHERE at.target_user_id = ? 
                        AND at.amount = ?
                        AND at.transaction_type = 'deduct'
                        AND datetime(at.created_at) >= datetime(?, '-5 minutes')
                        AND datetime(at.created_at) <= datetime(?, '+5 minutes')
                        ORDER BY ABS(julianday(at.created_at) - julianday(?)) ASC
                        LIMIT 1
                    `;
                    
                    db.get(transactionSql, [
                        pkg.user_id, 
                        pkg.amount, 
                        pkg.created_at, 
                        pkg.created_at, 
                        pkg.created_at
                    ], (transErr, transaction) => {
                        if (transErr) {
                            console.error(`❌ Error finding transaction for package ${pkg.id}:`, transErr);
                            skippedCount++;
                            return;
                        }
                        
                        if (transaction) {
                            // Update the package with the correct agent name
                            const updateSql = `UPDATE user_packages SET assigned_by = ? WHERE id = ?`;
                            const newAssignedBy = `Agent: ${transaction.agent_name}`;
                            
                            db.run(updateSql, [newAssignedBy, pkg.id], (updateErr) => {
                                if (updateErr) {
                                    console.error(`❌ Error updating package ${pkg.id}:`, updateErr);
                                    skippedCount++;
                                } else {
                                    console.log(`✅ Updated package ${pkg.id}: "Bot Agent" → "${newAssignedBy}"`);
                                    migratedCount++;
                                }
                                
                                // Check if this is the last package
                                if (migratedCount + skippedCount === packages.length) {
                                    console.log(`\n🎉 Migration completed!`);
                                    console.log(`✅ Migrated: ${migratedCount} packages`);
                                    console.log(`⚠️ Skipped: ${skippedCount} packages`);
                                    process.exit(0);
                                }
                            });
                        } else {
                            console.log(`⚠️ No matching transaction found for package ${pkg.id}, keeping as "Bot Agent"`);
                            skippedCount++;
                            
                            // Check if this is the last package
                            if (migratedCount + skippedCount === packages.length) {
                                console.log(`\n🎉 Migration completed!`);
                                console.log(`✅ Migrated: ${migratedCount} packages`);
                                console.log(`⚠️ Skipped: ${skippedCount} packages`);
                                process.exit(0);
                            }
                        }
                    });
                } catch (error) {
                    console.error(`❌ Error processing package ${pkg.id}:`, error);
                    skippedCount++;
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
migrateBotAgentPackages();