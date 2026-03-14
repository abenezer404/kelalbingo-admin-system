# Database Migration Guide

## Custom Balance Adjustment Feature Migration

### Overview
The custom balance adjustment feature requires the `user_packages` table to allow NULL values for the `package_id` column. This allows the system to store custom balance adjustments (positive or negative amounts) without requiring a predefined package.

### When Migration is Needed
You need to run the migration if:
- You have an existing database from before the custom balance adjustment feature was added
- You get a database error when trying to create custom balance adjustments
- The error message mentions "NOT NULL constraint failed: user_packages.package_id"

### How to Check if Migration is Needed
Run the migration script - it will automatically detect if migration is needed:

```bash
node migrate-user-packages.js
```

The script will output one of:
- "No migration needed" - Your database is already up to date
- "Migration completed successfully" - The migration was performed

### Migration Process

#### Step 1: Backup Your Database (Recommended)
Before running any migration, backup your database:

```bash
# Windows
copy data\admin.db data\admin.db.backup

# Linux/Mac
cp data/admin.db data/admin.db.backup
```

#### Step 2: Stop the Server
Make sure the admin server is not running:

```bash
# Press Ctrl+C if server is running
# Or kill the process
```

#### Step 3: Run Migration Script
```bash
cd bingo-admin-server
node migrate-user-packages.js
```

#### Step 4: Verify Migration
The script will show progress:
```
Connected to SQLite database
Starting migration...
Current schema: CREATE TABLE user_packages (...)
✓ Created new table with updated schema
✓ Copied all data to new table
✓ Dropped old table
✓ Renamed new table to user_packages

✅ Migration completed successfully!
The user_packages table now allows NULL package_id for custom balance adjustments.
```

#### Step 5: Start the Server
```bash
npm start
```

### What the Migration Does

1. **Creates a new table** (`user_packages_new`) with the updated schema where `package_id` can be NULL
2. **Copies all existing data** from the old table to the new table
3. **Drops the old table** after data is safely copied
4. **Renames the new table** to `user_packages`

### Schema Changes

**Before Migration:**
```sql
CREATE TABLE user_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  package_id INTEGER NOT NULL,  -- Cannot be NULL
  amount REAL NOT NULL,
  ...
)
```

**After Migration:**
```sql
CREATE TABLE user_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  package_id INTEGER,  -- Can be NULL for custom adjustments
  amount REAL NOT NULL,
  ...
)
```

### Rollback (If Needed)

If something goes wrong, you can restore from backup:

```bash
# Windows
copy data\admin.db.backup data\admin.db

# Linux/Mac
cp data/admin.db.backup data/admin.db
```

### Troubleshooting

#### Error: "Error opening database"
- Check that the database file exists at the configured path
- Verify file permissions

#### Error: "Error creating new table"
- The table might already exist from a previous failed migration
- Drop the `user_packages_new` table manually and try again:
  ```sql
  DROP TABLE IF EXISTS user_packages_new;
  ```

#### Error: "Error copying data"
- Check that the old table has data
- Verify the schema matches expected format

### For New Installations

If you're setting up a fresh database, no migration is needed. The correct schema will be created automatically when you first start the server.

### Testing After Migration

1. Start the server
2. Log in to admin dashboard
3. Go to Balance Packages page
4. Try creating a custom balance adjustment:
   - Select a user
   - Enter a positive amount (e.g., 100)
   - Enter a reason
   - Click "Apply Adjustment"
5. Verify the adjustment appears in the Recent Package Assignments table
6. Try a negative adjustment (e.g., -50)
7. Verify it appears with red text

### Support

If you encounter issues during migration:
1. Check the error message carefully
2. Verify your database backup exists
3. Review the migration script output
4. Check server logs for additional details
