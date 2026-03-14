# � KELALBINGO Admin System

## 🐳 Docker Deployment (Recommended)

### **Quick Start:**
1. **Install Docker Desktop** from [docker.com](https://www.docker.com/products/docker-desktop/)
2. **Start Docker Desktop** application
3. **Double-click** `docker-start.bat`
4. **Access** http://localhost:3000

### **Login Credentials:**
- **Username**: `kelalbingo_admin`
- **Password**: `KelalBingo@Admin2026!`
- **2FA Email**: `ebenezerandualem953@gmail.com`

### **Management:**
- **Start**: `docker-start.bat`
- **Stop**: `docker-stop.bat`
- **Logs**: `docker-logs.bat`

## � Features

### **User Management:**
- Create users with machine binding
- Manage user balances
- View user activity logs

### **Package System:**
- Create balance packages
- Track package purchases
- Manage pricing

### **Security:**
- 2FA authentication
- Auto-logout (15 minutes)
- Password change functionality
- Session management

## 📊 System Information

- **Port**: 3000 (http://localhost:3000)
- **Database**: SQLite (`./database/admin.db`)
- **Logs**: `./logs/` directory
- **Health Check**: http://localhost:3000/health

## 🛠️ Troubleshooting

### **Container Won't Start:**
- Ensure Docker Desktop is running
- Check port 3000 is available
- Run `docker-logs.bat` for details

### **Can't Access Admin Panel:**
- Verify container is running: `docker ps`
- Try http://127.0.0.1:3000
- Check Windows Firewall settings

### **Login Issues:**
- Use correct credentials above
- Check email for OTP code
- Ensure internet connection for 2FA

---

**🎯 Professional admin system for KELALBINGO!**