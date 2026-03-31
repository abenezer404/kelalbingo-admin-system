-- Migration script to add updated_at column to pending_users table
-- Run this on the PostgreSQL database to enable proper timestamp tracking

-- Add updated_at column with default value
ALTER TABLE pending_users 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Set initial values for existing records
UPDATE pending_users 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Create a trigger to automatically update the timestamp on row updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to the pending_users table
DROP TRIGGER IF EXISTS update_pending_users_updated_at ON pending_users;
CREATE TRIGGER update_pending_users_updated_at
    BEFORE UPDATE ON pending_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pending_users' AND column_name = 'updated_at';