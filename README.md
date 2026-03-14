# 🎯 KELALBINGO Admin System

A secure, professional web-based administration system for the KELALBINGO gaming platform.

## ✨ Features

- 🔐 **Secure Authentication** with 2FA (Email OTP)
- 👥 **User Management** with machine binding security
- 💰 **Balance & Package Management** with audit trails
- 📱 **Responsive Design** for mobile and desktop
- ⏰ **Auto-logout** after 15 minutes of inactivity
- 🎨 **Professional UI** with modal dialogs
- 📊 **Real-time Statistics** and monitoring
- 🔒 **Enterprise Security** with bcrypt password hashing

## 🚀 Quick Deploy to Free Hosting

### 1. Setup for Deployment
```bash
npm run deploy-setup
```
This generates secure secrets and deployment files.

### 2. Choose Free Hosting Platform

#### **Render.com (Recommended)**
- ✅ Always-on (no sleep)
- ✅ 750 hours/month free
- ✅ Automatic HTTPS
- ✅ Custom domains

#### **Railway**
- ✅ $5 free credit monthly
- ✅ Excellent performance
- ✅ Easy deployment

#### **Cyclic**
- ✅ Completely free
- ✅ Good uptime
- ✅ Simple setup

### 3. Deploy Steps
1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect Repository** to your chosen hosting platform

3. **Set Environment Variables** (copy from `.env.deploy`)

4. **Deploy** and access your admin panel!

## 📚 Documentation

- **[FREE_HOSTING_DEPLOYMENT.md](FREE_HOSTING_DEPLOYMENT.md)** - Complete deployment guide
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
- **[AUTO_LOGOUT_SYSTEM.md](AUTO_LOGOUT_SYSTEM.md)** - Security features
- **[ADMIN_MODAL_SYSTEM.md](ADMIN_MODAL_SYSTEM.md)** - UI components

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access admin panel
http://localhost:3000
```

## 🔐 Security Features

- **Password Hashing** with bcrypt
- **JWT Authentication** with secure tokens
- **2FA Email OTP** verification
- **Session Management** with auto-logout
- **Machine Binding** for device security
- **Input Validation** and XSS protection
- **Audit Logging** for all admin actions

## 📱 Admin Panel Features

### Dashboard
- Real-time user statistics
- System health monitoring
- Recent activity logs

### User Management
- Create/delete users with machine binding
- Password reset functionality
- User activity tracking

### Balance Management
- Package assignment system
- Balance adjustments with audit trails
- Transaction history

### Security
- Change admin password with 2FA
- Session monitoring
- Activity logging

## 🆓 Free Hosting Ready

This system is optimized for free hosting platforms:
- **Zero configuration** deployment
- **SQLite database** (no external DB needed)
- **Minimal resource usage**
- **Production-ready** security

## 🎯 Perfect For

- **Gaming platforms** user management
- **Small businesses** admin panels
- **Startups** with budget constraints
- **Learning projects** with real-world features
- **Proof of concepts** with professional UI

## 🏆 Production Grade

Despite being free-hosting ready, this system includes:
- Enterprise-level security
- Professional user interface
- Comprehensive audit trails
- Mobile-responsive design
- Real-time session management
- Automated security features

## 📞 Support

1. **Check Documentation** - Comprehensive guides included
2. **Review Logs** - Check hosting platform logs
3. **Test Locally** - Verify functionality locally first
4. **Follow Checklist** - Use DEPLOYMENT_CHECKLIST.md

---

**🎉 Deploy your professional admin system for FREE today!**

Built with ❤️ for the KELALBINGO gaming platform.