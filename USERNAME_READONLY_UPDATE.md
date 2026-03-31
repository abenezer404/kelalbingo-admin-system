# Username Read-Only Update

## Change Summary
Modified the user edit functionality to make the username field read-only. Administrators can now only edit the user's address, not their username.

## Rationale
- **Security**: Prevents accidental username changes that could break user authentication
- **Data Integrity**: Usernames are typically unique identifiers that shouldn't be changed
- **Consistency**: Maintains referential integrity across the system
- **Audit Trail**: Preserves original username for logging and tracking purposes

## Changes Made

### Backend Changes (`src/controllers/userController.js`)

#### updateUser Function:
- **Before**: Allowed updating both username and address
- **After**: Only allows updating address
- Removed username validation and uniqueness checks
- Simplified SQL query to only update address field
- Updated success message to reflect address-only updates

```javascript
// Old SQL
UPDATE pending_users SET username = ?, address = ? WHERE id = ?

// New SQL  
UPDATE pending_users SET address = ? WHERE id = ?
```

### Frontend Changes (`public/js/users.js`)

#### Edit Modal:
- **Username field**: Now read-only with disabled styling
- **Visual indicators**: Grayed out appearance and "not-allowed" cursor
- **Help text**: Added explanation that username cannot be changed
- **Button text**: Changed from "Update User" to "Update Address"
- **Form validation**: Removed username requirement validation

#### User List:
- **Button text**: Changed from "Edit" to "Edit Address" for clarity

### Client Application Changes (`main.js`)

#### Sync Functionality:
- **Update query**: Modified to only update address field locally
- **Preserved username**: Local username remains unchanged during sync
- **Logging**: Updated messages to reflect address-only updates

## User Experience

### Admin Panel:
1. Click "Edit Address" button next to any user
2. Modal opens with:
   - **Username**: Displayed but read-only (grayed out)
   - **Address**: Editable text field
3. Save button now says "Update Address"
4. Success message: "User address updated successfully"

### Client Application:
- Users receive address updates automatically
- Username remains unchanged during sync
- No impact on user authentication or login process

## API Changes

### PUT /admin/users/:id
**Request Body (Before):**
```json
{
  "username": "new_username",
  "address": "new_address"
}
```

**Request Body (After):**
```json
{
  "address": "new_address"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User address updated successfully"
}
```

## Database Impact
- No database schema changes required
- Only the `address` field is updated in `pending_users` table
- Username field remains untouched

## Security Benefits
1. **Prevents Identity Confusion**: Users maintain consistent identity
2. **Audit Trail Integrity**: Original usernames preserved in logs
3. **Authentication Stability**: No risk of breaking login credentials
4. **Referential Integrity**: Maintains consistency across related data

## Testing Checklist
- [ ] Admin can edit user address successfully
- [ ] Username field is visually read-only in edit modal
- [ ] Cannot submit form with modified username
- [ ] Client sync updates address but preserves username
- [ ] User login still works after address update
- [ ] Success messages reflect address-only changes

## Rollback Plan
If username editing needs to be restored:
1. Revert the `updateUser` function to accept username parameter
2. Add back username validation and uniqueness checks
3. Update frontend to make username field editable
4. Restore original SQL query and form validation

## Future Considerations
- If username changes are needed in the future, consider implementing a separate "Change Username" feature with additional security measures
- Could add username change history/audit log
- Might require user notification system for username changes