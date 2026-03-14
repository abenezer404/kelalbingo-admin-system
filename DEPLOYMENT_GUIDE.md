# KELALBINGO Admin Server - Deployment Guide

## Current Architecture Assessment

### ✅ Production Ready Features
- JWT authentication with configurable secrets
- Rate limiting (API: 50 req/15min, Admin: 200 req/15min)
- Environment variable configuration
- Modular code structure
- Input validation and sanitization
- CORS protection
- Helmet security headers

### ⚠️ Areas Needing Improvement

#### 1. **Security Enhancements**
- **HTTPS Required**: Currently HTTP only - needs SSL/TLS
- **Session Management**: JWT tokens don't expire on server side
- **Password Security**: Admin password in plain text in .env
- **Database Security**: SQLite file needs proper permissions
- **API Key Rotation**: Static API key needs rotation mechanism

#### 2. **Infrastructure Concerns**
- **Single Point of Failure**: One server handles everything
- **Database Backup**: No automated backup strategy
- **Logging**: Limited production logging
- **Monitoring**: No health checks or metrics
- **Process Management**: No PM2 or similar process manager

#### 3. **Scalability Issues**
- **SQLite Limitations**: Not suitable for high concurrency
- **In-Memory Storage**: Session data lost on restart
- **File Storage**: Database in local filesystem

## Deployment Options

### Option 1: Simple VPS Deployment (Recommended for Start)

**Requirements:**
- Ubuntu 20.04+ VPS (2GB RAM minimum)
- Domain name with SSL certificate
- Nginx reverse proxy

**Setup Steps:**
```bash
# 1. Server Setup
sudo apt update && sudo apt upgrade -y
sudo apt install nginx certbot python3-certbot-nginx nodejs npm -y

# 2. Install PM2 for process management
sudo npm install -g pm2

# 3. Clone and setup application
git clone <your-repo>
cd bingo-admin-server
npm install
cp .env.example .env
# Edit .env with production values

# 4. Setup SSL with Let's Encrypt
sudo certbot --nginx -d yourdomain.com

# 5. Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/bingo-admin
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN mkdir -p database

EXPOSE 3000
CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  bingo-admin:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./database:/app/database
      - ./logs:/app/logs
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - bingo-admin
    restart: unless-stopped
```

### Option 3: Cloud Platform Deployment

#### **Heroku (Easiest)**
- Add `Procfile`: `web: npm start`
- Use Heroku Postgres instead of SQLite
- Configure environment variables in dashboard

#### **DigitalOcean App Platform**
- Push to GitHub
- Connect repository to App Platform
- Configure environment variables
- Automatic SSL and scaling

#### **AWS/Azure/GCP**
- Use managed database (RDS/Azure SQL/Cloud SQL)
- Deploy to container service
- Use load balancer for high availability

## Security Hardening Checklist

### Immediate Actions Required:

1. **Enable HTTPS Only**
```javascript
// Add to server.js
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

2. **Hash Admin Password**
```javascript
// In .env, store hashed password instead of plain text
// Use bcrypt to hash the password
```

3. **Implement JWT Blacklist**
```javascript
// Add token blacklist for logout
const blacklistedTokens = new Set();
// Check blacklist in auth middleware
```

4. **Database Security**
```bash
# Set proper file permissions
chmod 600 database/admin.db
chown app:app database/admin.db
```

5. **Add Request Logging**
```javascript
// Add morgan for request logging
app.use(morgan('combined', { stream: fs.createWriteStream('./logs/access.log', { flags: 'a' }) }));
```

## Production Environment Variables

```env
NODE_ENV=production
PORT=3000
API_KEY=your-super-secure-api-key-change-this
JWT_SECRET=your-jwt-secret-minimum-32-characters
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$... # bcrypt hash
DATABASE_PATH=./database/admin.db
CORS_ORIGIN=https://yourdomain.com
```

## Monitoring and Maintenance

### Health Check Endpoint
```javascript
// Add to routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### Backup Strategy
```bash
# Daily database backup
0 2 * * * cp /app/database/admin.db /backups/admin-$(date +\%Y\%m\%d).db
```

### Log Rotation
```bash
# Install logrotate
sudo apt install logrotate
# Configure log rotation for application logs
```

## Performance Optimization

1. **Enable Gzip Compression**
2. **Add Caching Headers**
3. **Optimize Database Queries**
4. **Use CDN for Static Assets**
5. **Implement Connection Pooling**

## Recommended Deployment Timeline

### Phase 1: Basic Production (Week 1)
- VPS setup with Nginx + SSL
- PM2 process management
- Basic monitoring
- Database backups

### Phase 2: Security Hardening (Week 2)
- Password hashing
- JWT improvements
- Request logging
- Security headers

### Phase 3: Scalability (Month 2)
- Database migration to PostgreSQL
- Load balancing
- Advanced monitoring
- Auto-scaling

## Cost Estimates

- **VPS (2GB RAM)**: $10-20/month
- **Domain + SSL**: $15/year
- **Backup Storage**: $5/month
- **Monitoring Service**: $10/month

**Total**: ~$30-40/month for production-ready setup