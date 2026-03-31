const { db } = require('./src/config/database');

/**
 * Migration script to update old "Bot Agent" packages with proper agent names (PostgreSQL version)
 */

async function migrateBotAgentPackagesPostgres() {
    console.log('🔄 Starting migration of Bot Agent packages (PostgreSQL)...');
    
    try {
        // Update packages by joining with agent_transactions to find the correct agent
        const updateSql = `
            UPDATE user_packages 
            SET assigned_by = 'Agent: ' || a.name
            FROM agent_transactions at
            JOIN agents a ON at.agent_id = a.id
            WHERE user_packages.assigned_by = 'Bot Agent'
            AND user_packages.user_id = at.target_user_id
            AND user_packages.amount = at.amount
            AND at.transaction_type = 'deduct'
            AND ABS(EXTRACT(EPOCH FROM (user_packages.created_at - at.created_at))) <= 300
        `;
        
        db.run(updateSql, [], function(err) {
            if (err) {
                console.error('❌ Migration failed:', err);
                process.exit(1);
            } else {
                console.log(`✅ Migration completed! Updated ${this.changes} packages`);
                process.exit(0);
            }
        });
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
migrateBotAgentPackagesPostgres();