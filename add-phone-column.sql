-- Migration script to add phone column to pending_users table
-- Run this on the PostgreSQL database to enable phone number management

-- Add phone column with default value
ALTER TABLE pending_users 
ADD COLUMN phone VARCHAR(20) DEFAULT NULL;

-- Add index for phone number lookups (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_pending_users_phone ON pending_users(phone);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pending_users' AND column_name = 'phone';