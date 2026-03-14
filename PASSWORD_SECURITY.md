# Password Security Guide

## Overview

The admin system now uses **bcrypt hashing** for secure password storage. Passwords are never stored in plain text.

## Current Implementation

### Environment Variables
- `ADMIN_PASSWORD_HASH`: Hashed password (production)
- `ADMIN_PASSWORD`: Plain text password (development fallback only)

### Security Features
- **bcrypt hashing** with 10 salt rounds
- **Automatic fallback** for development environments
- **Database admin users** also use hashed passwords

## Password Management

### 1. Generate Password Hash

```bash
# Generate hash for a new password
node scripts/manage-admin-password.js hash "YourNewPassword123"
```

### 2. Update Admin Password

```bash
# Update .env file with new hashed password
node scripts/manage-admin-password.js update "YourNewPassword123"
```

### 3. Verify Password

```bash
# Verify a password against its hash
node scripts/manage-admin-password.js verify "password" "$2b$10$hash..."
```

## Production Setup

### Step 1: Generate Secure Password
```bash
# Use a strong password with:
# - At least 12 characters
# - Mix of uppercase, lowercase, numbers, symbols
node scripts/manage-admin-password.js hash "MySecurePassword@2024!"
```

### Step 2: Update .env File
```bash
# Option A: Use the update command
node scripts/manage-admin-password.js update "MySecurePassword@2024!"

# Option B: Manual update
# Add to .env:
ADMIN_PASSWORD_HASH=$2b$10$your-generated-hash-here
# Remove or comment out:
# ADMIN_PASSWORD=old-plain-text-password
```

### Step 3: Restart Server
```bash
npm start
```

## Security Best Practices

### Password Requirements
- **Minimum 12 characters**
- **Mix of character types**: uppercase, lowercase, numbers, symbols
- **Avoid common patterns**: no dictionary words, no personal info
- **Unique password**: don't reuse from other systems

### Environment Security
- **Never commit** .env files to version control
- **Use different passwords** for development and production
- **Rotate passwords** regularly (every 90 days)
- **Limit access** to .env files (chmod 600)

### Production Checklist
- [ ] Strong password generated
- [ ] Password hashed with bcrypt
- [ ] Plain text password removed from .env
- [ ] .env file permissions set to 600
- [ ] Server restarted with new hash
- [ ] Login tested successfully

## Migration from Plain Text

If you're upgrading from plain text passwords:

```bash
# 1. Generate hash for current password
node scripts/manage-admin-password.js hash "Hellobingo@7991"

# 2. Update .env automatically
node scripts/manage-admin-password.js update "Hellobingo@7991"

# 3. Restart server
npm start
```

## Troubleshooting

### Login Issues
1. **Check hash format**: Should start with `$2b$10$`
2. **Verify password**: Use the verify command
3. **Check .env syntax**: No spaces around `=`
4. **Restart server**: Changes require restart

### Hash Generation Issues
```bash
# Test hash generation
node scripts/manage-admin-password.js hash "test123"

# Should output something like:
# $2b$10$abcdefghijklmnopqrstuvwxyz...
```

### Development vs Production
- **Development**: Can use `ADMIN_PASSWORD` (plain text)
- **Production**: Must use `ADMIN_PASSWORD_HASH` (hashed)
- **Both**: Database admin users always use hashed passwords

## Security Notes

### Why bcrypt?
- **Slow by design**: Prevents brute force attacks
- **Salt included**: Each hash is unique
- **Future-proof**: Can increase rounds as hardware improves
- **Industry standard**: Widely tested and trusted

### Hash Properties
- **One-way**: Cannot be reversed to get original password
- **Deterministic**: Same password + salt = same hash
- **Unique salts**: Each hash has different salt
- **Time-resistant**: Configurable work factor

### Additional Security
Consider implementing:
- **Two-factor authentication** (2FA)
- **Account lockout** after failed attempts
- **Password expiration** policies
- **Audit logging** for login attempts