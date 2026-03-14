# Two-Factor Authentication (2FA) Setup Guide

## Overview

The KELALBINGO admin system now supports **Two-Factor Authentication (2FA)** using **Email OTP (One-Time Password)**. This significantly enhances security by requiring both:

1. **Something you know**: Username + Password
2. **Something you have**: Access to admin email

## Security Benefits

- **Prevents unauthorized access** even if password is compromised
- **Audit trail** through email logs
- **Time-limited codes** reduce attack window
- **Attempt limiting** prevents brute force attacks
- **Real-time notifications** of login attempts

## Setup Instructions

### Step 1: Configure Email Service

Choose one of the following email configurations:

#### Option A: Gmail (Recommended for Production)

1. **Enable 2FA on your Gmail account**
2. **Generate App-Specific Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"

3. **Update .env file**:
```env
EMAIL_ENABLED=true
EMAIL_SERVICE=gmail
EMAIL_USER=your-admin-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
ADMIN_EMAIL=your-admin-email@gmail.com
```

#### Option B: Custom SMTP Server

```env
EMAIL_ENABLED=true
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=admin@yourdomain.com
EMAIL_PASSWORD=your-smtp-password
ADMIN_EMAIL=admin@yourdomain.com
```

#### Option C: Development/Testing (Ethereal)

```env
EMAIL_ENABLED=true
EMAIL_SERVICE=ethereal
ADMIN_EMAIL=test@example.com
```

### Step 2: Configure OTP Settings

```env
OTP_ENABLED=true
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3
```

### Step 3: Set Admin Email

```env
ADMIN_EMAIL=your-admin-email@domain.com
```

### Step 4: Restart Server

```bash
npm start
```

## How It Works

### Login Flow

1. **User enters username/password**
2. **System verifies credentials**
3. **If valid**: OTP sent to admin email
4. **User enters 6-digit OTP**
5. **System verifies OTP**
6. **If valid**: JWT token issued

### OTP Properties

- **6-digit numeric code**
- **5-minute expiration** (configurable)
- **Single use only**
- **3 attempt limit** (configurable)
- **1-minute cooldown** between requests

## Email Template

The OTP email includes:

- **Professional design** with KELALBINGO branding
- **Large, clear OTP code**
- **Expiration timer**
- **Security warnings**
- **Timestamp and IP information**

## Security Features

### OTP Security
- **Cryptographically secure** random generation
- **Database storage** with expiration tracking
- **Automatic cleanup** of expired codes
- **Attempt limiting** prevents brute force
- **IP and User-Agent logging**

### Email Security
- **HTML templates** prevent spoofing
- **Security alerts** for successful logins
- **Audit trail** through email logs
- **Professional appearance** builds trust

## Configuration Options

### Email Services

| Service | Use Case | Setup Difficulty |
|---------|----------|------------------|
| Gmail | Production | Easy |
| SMTP | Custom servers | Medium |
| Ethereal | Development/Testing | Easy |

### OTP Settings

```env
# OTP expiry time (1-30 minutes recommended)
OTP_EXPIRY_MINUTES=5

# Maximum failed attempts (3-5 recommended)
OTP_MAX_ATTEMPTS=3
```

## Testing Setup

### 1. Development Mode (Ethereal)

```env
EMAIL_SERVICE=ethereal
OTP_ENABLED=true
ADMIN_EMAIL=test@example.com
```

- **No real email setup required**
- **Preview URLs** logged to console
- **Perfect for development**

### 2. Test Login Flow

1. Start server: `npm start`
2. Go to: `http://localhost:3000`
3. Enter credentials
4. Check console for preview URL (Ethereal)
5. Copy OTP from email preview
6. Complete login

## Production Deployment

### Gmail Setup (Recommended)

1. **Create dedicated admin Gmail account**
2. **Enable 2FA on the account**
3. **Generate app-specific password**
4. **Update production .env**:

```env
NODE_ENV=production
EMAIL_ENABLED=true
EMAIL_SERVICE=gmail
EMAIL_USER=admin@yourcompany.com
EMAIL_PASSWORD=abcd-efgh-ijkl-mnop
ADMIN_EMAIL=admin@yourcompany.com
OTP_ENABLED=true
```

### Security Checklist

- [ ] Strong admin password (hashed)
- [ ] Dedicated admin email account
- [ ] App-specific password (not main password)
- [ ] HTTPS enabled
- [ ] Firewall configured
- [ ] Regular security monitoring

## Troubleshooting

### Common Issues

#### 1. Email Not Sending

**Check:**
- Email credentials correct
- App-specific password (for Gmail)
- SMTP settings (for custom servers)
- Firewall not blocking SMTP ports

**Debug:**
```bash
# Check email service logs
tail -f logs/combined.log | grep -i email
```

#### 2. OTP Not Working

**Check:**
- OTP not expired (5-minute limit)
- Correct 6-digit code
- Not exceeded attempt limit
- Database permissions

**Debug:**
```bash
# Check OTP in database
sqlite3 database/admin.db "SELECT * FROM admin_otp ORDER BY created_at DESC LIMIT 5;"
```

#### 3. Login Stuck on OTP Screen

**Solutions:**
- Click "Back to Login" button
- Clear browser localStorage
- Check server logs for errors
- Verify email configuration

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "OTP generation failed" | Email service issue | Check email config |
| "No valid OTP found" | OTP expired/used | Request new OTP |
| "Too many failed attempts" | Exceeded attempt limit | Wait and request new OTP |
| "Admin email not configured" | Missing ADMIN_EMAIL | Set ADMIN_EMAIL in .env |

## Monitoring and Logs

### OTP Statistics

Access via admin dashboard or API:
```javascript
// Get OTP stats for last 24 hours
const stats = await otpService.getOTPStats();
```

### Security Alerts

Automatic email notifications for:
- Successful logins
- Failed login attempts
- Suspicious activity

### Log Files

- **Email logs**: Check email service status
- **OTP logs**: Track OTP generation/verification
- **Security logs**: Monitor login attempts

## Disabling 2FA (Not Recommended)

To disable 2FA temporarily:

```env
OTP_ENABLED=false
```

**Warning**: This reduces security significantly. Only disable for:
- Development/testing
- Emergency access
- Temporary troubleshooting

## Advanced Configuration

### Custom Email Templates

Modify `src/services/emailService.js`:
```javascript
getOTPEmailTemplate(otp, username) {
  // Customize HTML template here
}
```

### Multiple Admin Users

Add to database with email addresses:
```sql
INSERT INTO admin_users (username, password_hash, email) 
VALUES ('admin2', '$2b$10$...', 'admin2@company.com');
```

### Integration with External Services

- **Slack notifications**
- **SMS backup** (via Twilio)
- **Push notifications**
- **LDAP integration**

## Best Practices

1. **Use dedicated admin email**
2. **Enable email 2FA** on the email account itself
3. **Regular password rotation**
4. **Monitor login logs**
5. **Test backup access methods**
6. **Document recovery procedures**
7. **Train admin users** on 2FA process

## Support

For issues or questions:
1. Check this documentation
2. Review server logs
3. Test with Ethereal service
4. Verify email configuration
5. Check firewall/network settings