# Admin Server Troubleshooting Guide

## Common Issues and Solutions

### 1. CSS Not Loading (MIME Type Error)

**Error:**
```
Refused to apply style from 'http://localhost:3000/css/common.css' because its MIME type ('text/html') is not a supported stylesheet MIME type
```

**Cause:** Server routing issue or static file serving misconfiguration

**Solution:**
1. Restart the server: `npm start` or `node server.js`
2. Clear browser cache (Ctrl+Shift+Delete)
3. Hard refresh the page (Ctrl+F5)
4. Verify CSS files exist in `public/css/` folder

**Fixed in:** Server now explicitly sets MIME types for CSS and JS files

---

### 2. 409 Conflict Error (User Already Exists)

**Error:**
```
Failed to load resource: the server responded with a status of 409 (Conflict)
```

**Cause:** Trying to create a user with a username that already exists

**Solution:**
1. Choose a different username
2. Or delete the existing user first from the User Management page
3. Check the user list before creating new users

**This is expected behavior** - usernames must be unique

---

### 3. 429 Too Many Requests

**Error:**
```
Failed to load resource: the server responded with a status of 429 (Too Many Requests)
```

**Cause:** Rate limiting triggered (too many requests in short time)

**Solution:**
1. Wait 15 minutes for the rate limit to reset
2. Restart the server to reset counters immediately
3. For development, rate limits are now more lenient:
   - API routes: 50 requests per 15 minutes
   - Admin routes: 200 requests per 15 minutes

**Rate Limit Configuration:**
- API endpoints (`/api/*`): 50 requests per 15 minutes
- Admin endpoints (`/admin/*`): 200 requests per 15 minutes
- Static files: No rate limit

---

### 4. Cannot Connect to Server

**Error:**
```
Cannot connect to registration server. Please check your internet connection.
```

**Cause:** Server is not running or wrong URL

**Solution:**
1. Start the server: `cd bingo-admin-server && npm start`
2. Verify server is running on port 3000
3. Check console for "Admin Server running on port 3000"
4. Verify URL in desktop app matches server URL

---

### 5. Database Errors

**Error:**
```
Database error / Failed to initialize database
```

**Cause:** Database file corruption or permission issues

**Solution:**
1. Check if `database/admin.db` exists
2. Verify write permissions on database folder
3. Delete database file to recreate (WARNING: loses all data)
4. Check server console for detailed error messages

---

### 6. Authentication Errors

**Error:**
```
Invalid token / Unauthorized
```

**Cause:** JWT token expired or invalid

**Solution:**
1. Logout and login again
2. Clear browser localStorage
3. Check if JWT_SECRET matches in .env file
4. Verify token is being sent in Authorization header

---

### 7. Machine Serial Not Showing

**Issue:** Machine serial shows as "-" in logs

**Cause:** Desktop app not sending serial or serial retrieval failed

**Solution:**
1. Verify `getSerial()` function works on Windows
2. Check if WMIC command is available
3. Run `wmic bios get serialnumber` in command prompt
4. Ensure desktop app is updated with serial tracking code

---

## Server Restart Procedure

### Windows
```bash
# Stop server (Ctrl+C in terminal)
# Then restart:
cd bingo-admin-server
npm start
```

### Check Server Status
```bash
# Server should show:
🚀 KELALBINGO Admin Server running on port 3000
📊 Admin Portal: http://localhost:3000
🔑 API Endpoint: http://localhost:3000/api/sync-user
🌍 Environment: development
```

---

## Browser Cache Clearing

### Chrome/Edge
1. Press `Ctrl+Shift+Delete`
2. Select "Cached images and files"
3. Click "Clear data"
4. Or hard refresh: `Ctrl+F5`

### Firefox
1. Press `Ctrl+Shift+Delete`
2. Select "Cache"
3. Click "Clear Now"
4. Or hard refresh: `Ctrl+F5`

---

## Development Tips

### Enable Detailed Logging
Add to server.js:
```javascript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

### Disable Rate Limiting (Development Only)
Comment out rate limiters in server.js:
```javascript
// app.use('/api', apiLimiter, require('./src/routes/api'));
// app.use('/admin', adminLimiter, require('./src/routes/admin'));
app.use('/api', require('./src/routes/api'));
app.use('/admin', require('./src/routes/admin'));
```

### Check Database Contents
```bash
# Install SQLite browser or use command line
sqlite3 database/admin.db

# View tables
.tables

# View users
SELECT * FROM pending_users;

# View logs
SELECT * FROM password_reset_logs ORDER BY created_at DESC LIMIT 10;
```

---

## Port Conflicts

If port 3000 is already in use:

1. Change port in `.env`:
   ```
   PORT=3001
   ```

2. Update desktop app URLs in `main.js`:
   ```javascript
   const API_URL = 'http://localhost:3001/api/sync-user';
   ```

3. Restart both server and desktop app

---

## Network Issues

### Firewall Blocking
- Add exception for Node.js in Windows Firewall
- Allow port 3000 (or your custom port)

### Localhost Not Resolving
- Try `127.0.0.1` instead of `localhost`
- Check hosts file: `C:\Windows\System32\drivers\etc\hosts`

---

## Getting Help

If issues persist:

1. Check server console for error messages
2. Check browser console (F12) for client-side errors
3. Review server logs
4. Verify all dependencies are installed: `npm install`
5. Try deleting `node_modules` and reinstalling: `npm install`

---

## Quick Fixes Checklist

- [ ] Server is running
- [ ] Browser cache cleared
- [ ] Page hard refreshed (Ctrl+F5)
- [ ] No rate limit errors (wait or restart)
- [ ] Database file exists and is writable
- [ ] Correct port number in all configurations
- [ ] JWT token is valid (re-login if needed)
- [ ] Static files exist in public folder
- [ ] No firewall blocking connections
