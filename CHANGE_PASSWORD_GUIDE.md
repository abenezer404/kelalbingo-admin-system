# Admin Change Password Guide

## Overview

The KELALBINGO admin system now includes a secure **Change Password** feature with **2FA verification**. This allows admins to update their passwords without server restarts while maintaining high security standards.

## Security Features

### 🔐 Multi-Layer Security
- **Current password verification** - Must know existing password
- **2FA with OTP** - Email verification required
- **Password strength validation** - Enforces strong passwords
- **Audit trail** - All changes logged
- **Security notifications** - Email alerts sent
- **Auto-logout** - Forces re-authentication

### 🛡️ Password Requirements
- **Minimum 8 characters**
- **Mix of uppercase and lowercase letters**
- **At least one number**
- **At least one special character** (!@#$%^&*)
- **Different from current password**

## How to Change Password

### Step 1: Access Change Password
1. **Login to admin panel**: http://localhost:3000
2. **Navigate to sidebar**: Click "🔐 Change Password"

### Step 2: Enter Passwords
1. **Current Password**: Enter your existing password
2. **New Password**: Enter a strong new password
3. **Confirm Password**: Re-enter the new password
4. **Click "Send OTP"**

### Step 3: Verify OTP
1. **Check your email** for the 6-digit OTP code
2. **Enter OTP code** in the verification field
3. **Click "Change Password"**

### Step 4: Complete
1. **Success confirmation** displayed
2. **Automatic logout** after 5 seconds
3. **Login again** with new password

## Technical Implementation

### Backend Flow
```
1. POST /admin/request-password-change-otp
   - Validates JWT token
   - Sends OTP to admin email
   
2. POST /admin/change-password
   - Validates current password
   - Verifies OTP code
   - Hashes new password
   - Updates .env file
   - Logs change
   - Sends notification
```

### Database Changes
- **password_change_logs** table created
- **Audit trail** for all password changes
- **IP address and user agent** tracking

### File Updates
- **.env file** automatically updated
- **ADMIN_PASSWORD_HASH** replaced
- **Old plain text password** commented out

## Security Considerations

### What Happens During Change
1. **Current password verified** against hash
2. **OTP sent and verified** via email
3. **New password hashed** with bcrypt
4. **.env file updated** with new hash
5. **Change logged** in database
6. **Security email sent** to admin
7. **User logged out** automatically

### Security Benefits
- **No server restart required**
- **Old sessions remain valid** until natural expiry
- **Audit trail maintained**
- **Email notifications** for security monitoring
- **Strong password enforcement**

## Troubleshooting

### Common Issues

#### 1. "Current password is incorrect"
**Solution**: Verify you're entering the correct current password

#### 2. "OTP verification failed"
**Possible causes**:
- OTP expired (5-minute limit)
- Wrong OTP code entered
- Too many failed attempts

**Solution**: Click "Back" and request new OTP

#### 3. "Failed to update environment password"
**Possible causes**:
- File permission issues
- .env file not found
- Disk space issues

**Solution**: Check server logs and file permissions

#### 4. "Admin email not configured"
**Solution**: Set `ADMIN_EMAIL` in .env file

### Error Recovery

#### If Password Change Fails Mid-Process
1. **Current password still works** - no change applied
2. **Try the process again**
3. **Check server logs** for specific errors

#### If .env Update Fails
1. **Password change will be rejected**
2. **No partial updates** - atomic operation
3. **Current password remains valid**

## Monitoring and Logs

### Password Change Logs
```sql
SELECT * FROM password_change_logs 
ORDER BY changed_at DESC;
```

### Log Information
- **Username** - Who changed password
- **IP Address** - Where change originated
- **User Agent** - Browser/client info
- **Timestamp** - When change occurred

### Security Notifications
Automatic emails sent for:
- **Successful password changes**
- **Failed change attempts** (if configured)
- **Multiple failed OTP attempts**

## Best Practices

### For Admins
1. **Change passwords regularly** (every 90 days)
2. **Use strong, unique passwords**
3. **Don't reuse old passwords**
4. **Monitor security notification emails**
5. **Log out from all devices** after change

### For System Administrators
1. **Monitor password change logs**
2. **Set up log rotation** for audit files
3. **Regular backup** of .env files
4. **Monitor email delivery** for OTP
5. **Review security notifications**

## Configuration

### Required Settings
```env
# Admin Configuration
ADMIN_USERNAME=your-username
ADMIN_EMAIL=your-email@domain.com
ADMIN_PASSWORD_HASH=your-bcrypt-hash

# 2FA Configuration
OTP_ENABLED=true
EMAIL_ENABLED=true
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Optional Settings
```env
# OTP Configuration
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3

# Security
NODE_ENV=production
```

## API Endpoints

### Request OTP for Password Change
```http
POST /admin/request-password-change-otp
Authorization: Bearer <jwt-token>
```

### Change Password
```http
POST /admin/change-password
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "currentPassword": "current-password",
  "newPassword": "new-strong-password",
  "otpCode": "123456"
}
```

## Testing

### Manual Testing
```bash
# Test the change password system
npm run test-change-password

# Start server
npm start

# Access: http://localhost:3000
# Login and navigate to Change Password
```

### Automated Testing
```bash
# Test 2FA system (required for password change)
npm run test-2fa-quiet
```

## Security Recommendations

### Production Deployment
1. **Use HTTPS only** - Never HTTP in production
2. **Strong JWT secrets** - Use long, random strings
3. **Regular password rotation** - Enforce policy
4. **Monitor logs** - Set up alerting
5. **Backup .env files** - Secure storage

### Email Security
1. **Use app-specific passwords** for Gmail
2. **Enable 2FA** on email account
3. **Monitor email logs** for delivery issues
4. **Use dedicated admin email** if possible

## Recovery Procedures

### If Admin Forgets New Password
1. **Stop the server**
2. **Restore .env from backup** OR
3. **Generate new password hash**:
   ```bash
   npm run hash-password "new-password"
   ```
4. **Update .env manually**
5. **Restart server**

### If Email System Fails
1. **Temporary disable OTP**:
   ```env
   OTP_ENABLED=false
   ```
2. **Change password via scripts**:
   ```bash
   npm run update-password "new-password"
   ```
3. **Re-enable OTP** after fixing email

This change password system provides enterprise-grade security while maintaining usability for admin password management.