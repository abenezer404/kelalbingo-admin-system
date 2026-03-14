# Gmail Setup Guide for 2FA

## Step-by-Step Gmail Configuration

### Step 1: Enable 2FA on Your Gmail Account

1. **Go to Google Account Settings**:
   - Visit: https://myaccount.google.com/
   - Click "Security" in the left sidebar

2. **Enable 2-Step Verification**:
   - Find "2-Step Verification" section
   - Click "Get started" and follow the setup process
   - Use your phone number for verification

### Step 2: Generate App-Specific Password

1. **After 2FA is enabled**, go back to Security settings
2. **Find "App passwords"** section
3. **Click "App passwords"**
4. **Select "Mail" from the dropdown**
5. **Click "Generate"**
6. **Copy the 16-character password** (format: xxxx-xxxx-xxxx-xxxx)

### Step 3: Update .env File

Replace your current email configuration with:

```env
# Email Configuration for OTP
EMAIL_ENABLED=true
EMAIL_SERVICE=gmail
EMAIL_USER=ebenezerandualem953@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
ADMIN_EMAIL=ebenezerandualem953@gmail.com
```

### Step 4: Test the Configuration

```bash
npm run test-2fa
```

## Common Issues and Solutions

### Issue 1: "Invalid credentials" error
**Solution**: Make sure you're using the **App-Specific Password**, not your regular Gmail password.

### Issue 2: "Less secure app access" error
**Solution**: App-specific passwords bypass this restriction. Don't enable "Less secure app access".

### Issue 3: Still using Ethereal
**Solution**: Make sure `EMAIL_SERVICE=gmail` (not `ethereal`).

### Issue 4: Email not received
**Possible causes**:
- Wrong app-specific password
- Gmail blocking the email
- Email in spam folder
- 2FA not properly enabled

## Security Notes

- **Never use your regular Gmail password** for app authentication
- **App-specific passwords are safer** than regular passwords
- **Each app should have its own password**
- **You can revoke app passwords** anytime from Google Account settings

## Testing Steps

1. **Generate app-specific password**
2. **Update .env file**
3. **Restart server**: `npm start`
4. **Test**: `npm run test-2fa`
5. **Try login**: Go to http://localhost:3000

## Troubleshooting Commands

```bash
# Test 2FA system
npm run test-2fa

# Check current configuration
npm run setup-email

# Start server with logs
npm start
```

If you see "Email sent successfully" in the test, but don't receive the email, check your Gmail spam folder.