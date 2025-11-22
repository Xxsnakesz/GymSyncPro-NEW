# Deployment Guide

This guide will help you deploy GymSyncPro to a VPS (Virtual Private Server).

## Prerequisites

- VPS with Ubuntu 20.04+ or similar Linux distribution
- Root or sudo access
- Domain name (optional but recommended)
- SSH access to your VPS

## Step 1: Server Setup

### 1.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker-compose --version
```

### 1.3 Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Step 2: Application Setup

### 2.1 Clone Repository

```bash
# Navigate to a suitable directory
cd /opt

# Clone the repository
sudo git clone <your-repo-url> gymsyncpro
cd gymsyncpro

# Set ownership
sudo chown -R $USER:$USER /opt/gymsyncpro
```

### 2.2 Configure Environment Variables

```bash
# Create .env file
cp .env.example .env
nano .env
```

**Required environment variables:**

```env
# Database
POSTGRES_USER=gymsyncpro
POSTGRES_PASSWORD=your-secure-password-here
POSTGRES_DB=gymsyncpro
DATABASE_URL=postgresql://gymsyncpro:your-secure-password-here@postgres:5432/gymsyncpro?schema=public

# Backend
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-very-secure-session-secret-here

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=your-email@yourdomain.com

# Frontend
NEXT_PUBLIC_API_URL=http://your-domain.com

# CORS
ALLOWED_ORIGINS=http://your-domain.com,https://your-domain.com
```

**Generate secure secrets:**
```bash
# Generate session secret
openssl rand -base64 32

# Generate database password
openssl rand -base64 24
```

### 2.3 Set Up SSL (Recommended)

For production, use Let's Encrypt with Certbot:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Certificates will be saved to:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

Update nginx configuration to use SSL certificates.

## Step 3: Configure Nginx

### 3.1 Update Nginx Configuration

Edit `nginx/conf.d/default.conf`:

1. Replace `your-domain.com` with your actual domain
2. Uncomment HTTPS server block
3. Update SSL certificate paths if using custom certificates

### 3.2 Update Domain in Docker Compose

Edit `docker-compose.yml` nginx service if needed.

## Step 4: Deploy Application

### 4.1 Build and Start Services

```bash
# Make deploy script executable
chmod +x scripts/deploy.sh

# Run deployment script
./scripts/deploy.sh
```

Or manually:

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4.2 Run Database Migrations

```bash
docker-compose exec backend npx prisma migrate deploy
```

### 4.3 Seed Database (Optional)

```bash
docker-compose exec backend npm run db:seed
```

## Step 5: Verify Deployment

### 5.1 Check Services

```bash
# Check container status
docker-compose ps

# Check backend health
curl http://localhost/api/health

# Check frontend
curl http://localhost/
```

### 5.2 View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

## Step 6: Maintenance

### 6.1 Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# Run migrations if schema changed
docker-compose exec backend npx prisma migrate deploy
```

### 6.2 Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U gymsyncpro gymsyncpro > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T postgres psql -U gymsyncpro gymsyncpro < backup.sql
```

### 6.3 Monitor Resources

```bash
# Check container resource usage
docker stats

# Check disk usage
df -h

# Check Docker disk usage
docker system df
```

## Troubleshooting

### Issue: Services won't start

```bash
# Check logs
docker-compose logs

# Check if ports are in use
sudo netstat -tulpn | grep -E ':(80|443|3000|5000|5432)'
```

### Issue: Database connection errors

```bash
# Check database container
docker-compose logs postgres

# Test database connection
docker-compose exec backend npx prisma db pull
```

### Issue: Nginx configuration errors

```bash
# Test nginx configuration
docker-compose exec nginx nginx -t

# Reload nginx
docker-compose exec nginx nginx -s reload
```

### Issue: Out of disk space

```bash
# Clean up Docker
docker system prune -a

# Remove unused volumes
docker volume prune
```

## Security Checklist

- [ ] Changed all default passwords
- [ ] Set strong SESSION_SECRET
- [ ] Configured SSL certificates
- [ ] Set up firewall rules
- [ ] Enabled automatic security updates
- [ ] Configured fail2ban (optional)
- [ ] Set up regular backups
- [ ] Limited SSH access (disable root login)
- [ ] Set up monitoring and alerts

## Performance Optimization

1. **Enable Gzip compression** (already configured in nginx)
2. **Set up CDN** for static assets
3. **Configure caching** in nginx
4. **Enable database connection pooling**
5. **Set up Redis** for session storage (optional)
6. **Configure log rotation**

## Scaling

For horizontal scaling:

1. Use a load balancer (e.g., AWS ELB, DigitalOcean Load Balancer)
2. Run multiple backend instances
3. Use managed PostgreSQL database
4. Set up Redis for session storage
5. Configure shared file storage (S3, etc.)

## Support

For issues during deployment:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Check network connectivity
4. Review firewall rules
5. Open an issue on GitHub
