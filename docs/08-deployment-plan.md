# KẾ HOẠCH TRIỂN KHAI

## Hệ Thống Quản Lý Khoá Học Trực Tuyến (E-Learning Platform)

---

## 1. Tổng quan

### 1.1. Kiến trúc triển khai

| Component            | Platform            | URL                      |
| -------------------- | ------------------- | ------------------------ |
| **Next.js Frontend** | Vercel (Serverless) | `https://www.domain.com` |
| **Directus Backend** | VPS (Docker)        | `https://api.domain.com` |
| **PostgreSQL**       | VPS (Docker)        | Internal port 5432       |
| **Redis**            | VPS (Docker)        | Internal port 6379       |

### 1.2. Domain Setup

| Domain           | Mục đích    | DNS Record                   |
| ---------------- | ----------- | ---------------------------- |
| `domain.com`     | Root domain | A → Vercel IP                |
| `www.domain.com` | Frontend    | CNAME → cname.vercel-dns.com |
| `api.domain.com` | Backend API | A → VPS IP                   |

---

## 2. Yêu cầu hạ tầng

### 2.1. VPS Server (Directus + PostgreSQL + Redis)

| Thông số      | Yêu cầu tối thiểu | Đề xuất          |
| ------------- | ----------------- | ---------------- |
| **OS**        | Ubuntu 22.04 LTS  | Ubuntu 22.04 LTS |
| **CPU**       | 2 vCPU            | 4 vCPU           |
| **RAM**       | 4 GB              | 8 GB             |
| **Storage**   | 40 GB SSD         | 80 GB SSD        |
| **Bandwidth** | 2 TB/tháng        | Unlimited        |
| **Network**   | IPv4 public       | IPv4 + IPv6      |

**Phân bổ tài nguyên ước tính:**

| Service         | CPU      | RAM    | Storage |
| --------------- | -------- | ------ | ------- |
| Directus        | 1 core   | 1-2 GB | 5 GB    |
| PostgreSQL      | 1 core   | 1-2 GB | 20 GB+  |
| Redis           | 0.5 core | 512 MB | 1 GB    |
| Nginx           | 0.5 core | 256 MB | 1 GB    |
| OS + Monitoring | -        | 512 MB | 5 GB    |

**Nhà cung cấp VPS đề xuất:**

- DigitalOcean Droplet (4 GB / 2 vCPU): ~$24/tháng
- Vultr Cloud Compute (4 GB / 2 vCPU): ~$24/tháng
- AWS Lightsail (4 GB / 2 vCPU): ~$20/tháng

### 2.2. Vercel (Next.js Frontend)

| Thông số                 | Free Tier            | Pro Tier      |
| ------------------------ | -------------------- | ------------- |
| **Bandwidth**            | 100 GB/tháng         | 1 TB/tháng    |
| **Serverless Execution** | 100 GB-Hours         | 1000 GB-Hours |
| **Build Time**           | 6000 min/tháng       | Unlimited     |
| **Edge Network**         | Global CDN           | Global CDN    |
| **Custom Domains**       | Yes                  | Yes           |
| **SSL**                  | Auto (Let's Encrypt) | Auto          |

**Cho production:** Vercel Pro ($20/tháng) được đề xuất.

---

## 3. Thiết lập VPS Server

### 3.1. Initial Server Setup

```bash
# 1. Kết nối SSH
ssh root@<VPS_IP>

# 2. Cập nhật hệ thống
apt update && apt upgrade -y

# 3. Tạo user non-root
adduser deployer
usermod -aG sudo deployer

# 4. Cấu hình SSH key authentication
mkdir -p /home/deployer/.ssh
cp ~/.ssh/authorized_keys /home/deployer/.ssh/
chown -R deployer:deployer /home/deployer/.ssh

# 5. Tắt SSH root login và password authentication
# Edit /etc/ssh/sshd_config:
# PermitRootLogin no
# PasswordAuthentication no
systemctl restart sshd

# 6. Cấu hình firewall (UFW)
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# 7. Cài đặt các công cụ cần thiết
apt install -y curl git htop unzip fail2ban
```

### 3.2. Cài đặt Docker & Docker Compose

```bash
# 1. Cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 2. Thêm user vào group docker
usermod -aG docker deployer

# 3. Enable Docker service
systemctl enable docker
systemctl start docker

# 4. Cài Docker Compose plugin
apt install docker-compose-plugin -y

# 5. Verify
docker --version
docker compose version
```

### 3.3. Cài đặt Nginx

```bash
# 1. Cài Nginx
apt install -y nginx

# 2. Enable Nginx
systemctl enable nginx
systemctl start nginx
```

### 3.4. Cài đặt Certbot (SSL)

```bash
# 1. Cài Certbot
apt install -y certbot python3-certbot-nginx

# 2. Tạo SSL certificate
certbot --nginx -d api.domain.com

# 3. Verify auto-renewal
certbot renew --dry-run
```

---

## 4. Triển khai Directus (Docker)

### 4.1. Cấu trúc thư mục

```
/home/deployer/elearning/
├── docker-compose.yml
├── .env
├── nginx/
│   └── api.domain.com.conf
├── backups/
│   └── (database dumps)
├── uploads/
│   └── (Directus uploads)
└── snapshots/
    └── (Directus schema snapshots)
```

### 4.2. Docker Compose File

```yaml
# docker-compose.yml
version: "3.8"

services:
  directus:
    image: directus/directus:11
    container_name: elearning-directus
    restart: unless-stopped
    ports:
      - "127.0.0.1:8055:8055"
    volumes:
      - ./uploads:/directus/uploads
      - ./extensions:/directus/extensions
      - ./snapshots:/directus/snapshots
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      # General
      PUBLIC_URL: "https://api.domain.com"
      LOG_LEVEL: "info"
      LOG_STYLE: "pretty"

      # Secret
      SECRET: "${DIRECTUS_SECRET}"
      KEY: "${DIRECTUS_KEY}"

      # Database
      DB_CLIENT: "pg"
      DB_HOST: "postgres"
      DB_PORT: "5432"
      DB_DATABASE: "${DB_DATABASE}"
      DB_USER: "${DB_USER}"
      DB_PASSWORD: "${DB_PASSWORD}"

      # Redis
      REDIS_HOST: "redis"
      REDIS_PORT: "6379"

      # Cache
      CACHE_ENABLED: "true"
      CACHE_STORE: "redis"
      CACHE_AUTO_PURGE: "true"
      CACHE_TTL: "5m"

      # Rate Limiting
      RATE_LIMITER_ENABLED: "true"
      RATE_LIMITER_STORE: "redis"
      RATE_LIMITER_POINTS: "50"
      RATE_LIMITER_DURATION: "1"

      # Auth
      AUTH_PROVIDERS: ""
      ACCESS_TOKEN_TTL: "15m"
      REFRESH_TOKEN_TTL: "7d"

      # CORS
      CORS_ENABLED: "true"
      CORS_ORIGIN: "https://www.domain.com,https://domain.com"
      CORS_METHODS: "GET,POST,PATCH,DELETE"
      CORS_ALLOWED_HEADERS: "Content-Type,Authorization"

      # File Storage
      STORAGE_LOCATIONS: "local"
      STORAGE_LOCAL_DRIVER: "local"
      STORAGE_LOCAL_ROOT: "/directus/uploads"

      # Admin Account
      ADMIN_EMAIL: "${ADMIN_EMAIL}"
      ADMIN_PASSWORD: "${ADMIN_PASSWORD}"

      # Email
      EMAIL_FROM: "${EMAIL_FROM}"
      EMAIL_TRANSPORT: "smtp"
      EMAIL_SMTP_HOST: "${SMTP_HOST}"
      EMAIL_SMTP_PORT: "${SMTP_PORT}"
      EMAIL_SMTP_USER: "${SMTP_USER}"
      EMAIL_SMTP_PASSWORD: "${SMTP_PASSWORD}"
      EMAIL_SMTP_SECURE: "true"

    healthcheck:
      test: wget --no-verbose --tries=1 --spider http://localhost:8055/server/health || exit 1
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s

  postgres:
    image: postgres:16-alpine
    container_name: elearning-postgres
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: "${DB_DATABASE}"
      POSTGRES_USER: "${DB_USER}"
      POSTGRES_PASSWORD: "${DB_PASSWORD}"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_DATABASE}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: elearning-redis
    restart: unless-stopped
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

### 4.3. Environment Variables (.env)

```bash
# .env (KHÔNG commit vào Git)

# Directus
DIRECTUS_SECRET=your-random-secret-key-min-32-chars
DIRECTUS_KEY=your-random-key-min-32-chars

# Database
DB_DATABASE=elearning
DB_USER=elearning_user
DB_PASSWORD=your-strong-database-password

# Admin
ADMIN_EMAIL=admin@domain.com
ADMIN_PASSWORD=your-admin-password

# Email (SMTP)
EMAIL_FROM=noreply@domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 4.4. Nginx Configuration

```nginx
# /etc/nginx/sites-available/api.domain.com

server {
    listen 80;
    server_name api.domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.domain.com;

    # SSL (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/api.domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Upload size
    client_max_body_size 50M;

    # Proxy to Directus
    location / {
        proxy_pass http://127.0.0.1:8055;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

### 4.5. Khởi chạy Directus

```bash
# 1. Tạo thư mục
cd /home/deployer
mkdir -p elearning/{uploads,extensions,snapshots,backups}
cd elearning

# 2. Copy docker-compose.yml và .env (từ local hoặc git)

# 3. Khởi chạy services
docker compose up -d

# 4. Kiểm tra logs
docker compose logs -f directus

# 5. Kiểm tra health
curl http://localhost:8055/server/health

# 6. Enable Nginx site
ln -s /etc/nginx/sites-available/api.domain.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 5. Triển khai Next.js (Vercel)

### 5.1. Chuẩn bị dự án

```bash
# 1. Đảm bảo dự án đã push lên GitHub

# 2. Kiểm tra next.config.js
# - Cấu hình images domains cho Directus
# - Cấu hình environment variables
```

### 5.2. Vercel Deployment Steps

1. **Import Project:**
   - Truy cập https://vercel.com
   - Nhấn "New Project"
   - Import từ GitHub repository
   - Chọn repository elearning

2. **Configure Build Settings:**
   - Framework Preset: Next.js (auto-detected)
   - Build Command: `next build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

3. **Set Environment Variables:**

| Variable                   | Value                        | Environment |
| -------------------------- | ---------------------------- | ----------- |
| `NEXT_PUBLIC_APP_URL`      | `https://www.domain.com`     | Production  |
| `NEXT_PUBLIC_DIRECTUS_URL` | `https://api.domain.com`     | Production  |
| `DIRECTUS_URL`             | `https://api.domain.com`     | Production  |
| `DIRECTUS_ADMIN_TOKEN`     | `your-directus-static-token` | Production  |
| `AUTH_SECRET`              | `your-auth-secret`           | Production  |
| `NODE_ENV`                 | `production`                 | Production  |

4. **Custom Domain:**
   - Settings → Domains → Add `www.domain.com`
   - Vercel cung cấp CNAME record
   - Cấu hình DNS: `www` CNAME → `cname.vercel-dns.com`

5. **Deploy:**
   - Nhấn "Deploy"
   - Vercel tự động build và deploy
   - Kiểm tra deployment URL

### 5.3. Vercel Configuration (vercel.json)

```json
{
  "framework": "nextjs",
  "regions": ["sin1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### 5.4. Tự động triển khai (CI/CD)

Vercel tự động triển khai khi:

- **Production:** Push/merge vào branch `main`
- **Preview:** Tạo Pull Request (mỗi PR có URL riêng)

---

## 6. Environment Variables Tổng hợp

### 6.1. Directus (.env trên VPS)

```bash
# Directus Core
DIRECTUS_SECRET=<random-string-32-chars>
DIRECTUS_KEY=<random-string-32-chars>

# Database
DB_DATABASE=elearning
DB_USER=elearning_user
DB_PASSWORD=<strong-password>

# Admin
ADMIN_EMAIL=admin@domain.com
ADMIN_PASSWORD=<strong-password>

# SMTP
EMAIL_FROM=noreply@domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<email>
SMTP_PASSWORD=<app-password>
```

### 6.2. Next.js (Vercel Environment Variables)

```bash
# Public (accessible in browser)
NEXT_PUBLIC_APP_URL=https://www.domain.com
NEXT_PUBLIC_DIRECTUS_URL=https://api.domain.com

# Server-only
DIRECTUS_URL=https://api.domain.com
DIRECTUS_ADMIN_TOKEN=<static-token-from-directus>
AUTH_SECRET=<random-string-for-session>
```

---

## 7. SSL/TLS Configuration

### 7.1. VPS (api.domain.com)

```bash
# Certbot (Let's Encrypt) - auto managed
certbot --nginx -d api.domain.com

# Auto-renewal (cron tự động bởi certbot)
# Kiểm tra: certbot renew --dry-run
```

### 7.2. Vercel (www.domain.com)

- SSL tự động cung cấp bởi Vercel (Let's Encrypt)
- Không cần cấu hình thủ công

---

## 8. Chiến lược Backup

### 8.1. Database Backup

```bash
#!/bin/bash
# /home/deployer/elearning/scripts/backup-db.sh

# Cấu hình
BACKUP_DIR="/home/deployer/elearning/backups"
DB_CONTAINER="elearning-postgres"
DB_NAME="elearning"
DB_USER="elearning_user"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Tạo backup
echo "Starting database backup..."
docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME -F c -f /tmp/backup_$DATE.dump
docker cp $DB_CONTAINER:/tmp/backup_$DATE.dump $BACKUP_DIR/backup_$DATE.dump
docker exec $DB_CONTAINER rm /tmp/backup_$DATE.dump

# Compress
gzip $BACKUP_DIR/backup_$DATE.dump

# Xoá backup cũ (giữ 30 ngày)
find $BACKUP_DIR -name "backup_*.dump.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: backup_$DATE.dump.gz"
```

### 8.2. Lịch Backup (Cron)

```bash
# Crontab cho user deployer
crontab -e

# Daily backup lúc 2:00 AM
0 2 * * * /home/deployer/elearning/scripts/backup-db.sh >> /home/deployer/elearning/backups/backup.log 2>&1

# Weekly full backup (Sunday 3:00 AM) - bao gồm uploads
0 3 * * 0 tar -czf /home/deployer/elearning/backups/full_$(date +\%Y\%m\%d).tar.gz /home/deployer/elearning/uploads >> /home/deployer/elearning/backups/backup.log 2>&1
```

### 8.3. Database Restore

```bash
#!/bin/bash
# Restore từ backup

BACKUP_FILE=$1
DB_CONTAINER="elearning-postgres"
DB_NAME="elearning"
DB_USER="elearning_user"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore-db.sh <backup_file.dump.gz>"
    exit 1
fi

# Decompress nếu .gz
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -k $BACKUP_FILE
    BACKUP_FILE="${BACKUP_FILE%.gz}"
fi

# Copy vào container
docker cp $BACKUP_FILE $DB_CONTAINER:/tmp/restore.dump

# Restore
docker exec $DB_CONTAINER pg_restore -U $DB_USER -d $DB_NAME -c /tmp/restore.dump

# Cleanup
docker exec $DB_CONTAINER rm /tmp/restore.dump

echo "Restore completed from $BACKUP_FILE"
```

---

## 9. Giám sát (Monitoring)

### 9.1. Health Check Monitoring

```bash
#!/bin/bash
# /home/deployer/elearning/scripts/health-check.sh

DIRECTUS_URL="https://api.domain.com/server/health"
FRONTEND_URL="https://www.domain.com"
ALERT_EMAIL="admin@domain.com"

# Check Directus
DIRECTUS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $DIRECTUS_URL)
if [ "$DIRECTUS_STATUS" != "200" ]; then
    echo "ALERT: Directus is DOWN (HTTP $DIRECTUS_STATUS)" | mail -s "E-Learning Alert: Directus DOWN" $ALERT_EMAIL
fi

# Check Frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)
if [ "$FRONTEND_STATUS" != "200" ]; then
    echo "ALERT: Frontend is DOWN (HTTP $FRONTEND_STATUS)" | mail -s "E-Learning Alert: Frontend DOWN" $ALERT_EMAIL
fi
```

```bash
# Cron: Check mỗi 5 phút
*/5 * * * * /home/deployer/elearning/scripts/health-check.sh
```

### 9.2. Docker Monitoring

```bash
# Xem trạng thái containers
docker compose ps

# Xem resource usage
docker stats --no-stream

# Xem logs
docker compose logs -f --tail=100 directus
docker compose logs -f --tail=100 postgres
```

### 9.3. Công cụ giám sát đề xuất

| Công cụ                  | Mục đích                    | Chi phí              |
| ------------------------ | --------------------------- | -------------------- |
| **UptimeRobot**          | Uptime monitoring, alerting | Free (50 monitors)   |
| **Vercel Analytics**     | Frontend performance        | Included with Vercel |
| **Docker Health Checks** | Container health            | Free (built-in)      |
| **htop**                 | Server resource monitoring  | Free                 |

---

## 10. Quy trình cập nhật (Update Procedures)

### 10.1. Cập nhật Frontend (Next.js)

```bash
# 1. Push code mới lên GitHub branch main
git push origin main

# 2. Vercel tự động detect và deploy
# 3. Kiểm tra Vercel dashboard cho deployment status
# 4. Nếu lỗi, Vercel tự rollback về bản trước
```

### 10.2. Cập nhật Backend (Directus)

```bash
# 1. SSH vào VPS
ssh deployer@<VPS_IP>
cd /home/deployer/elearning

# 2. Backup database trước
./scripts/backup-db.sh

# 3. Pull image mới
docker compose pull directus

# 4. Restart với image mới
docker compose up -d directus

# 5. Kiểm tra logs
docker compose logs -f directus

# 6. Kiểm tra health
curl https://api.domain.com/server/health
```

### 10.3. Cập nhật Schema (Directus)

```bash
# 1. Export schema từ development
npx directus schema snapshot ./snapshots/schema-update.yaml

# 2. Copy lên VPS
scp ./snapshots/schema-update.yaml deployer@VPS_IP:/home/deployer/elearning/snapshots/

# 3. Apply trên VPS
docker exec elearning-directus npx directus schema apply /directus/snapshots/schema-update.yaml
```

---

## 11. Checklist triển khai

### 11.1. Pre-deployment

- [ ] Code đã merge vào branch main
- [ ] Tất cả test cases PASS
- [ ] Environment variables đã cấu hình đầy đủ
- [ ] Database schema đã cập nhật
- [ ] Seed data đã tạo (roles, admin user, categories)
- [ ] SSL certificates đã cài đặt
- [ ] DNS records đã cấu hình
- [ ] Backup script đã setup
- [ ] Firewall rules đã cấu hình

### 11.2. Deployment

- [ ] Docker containers chạy thành công
- [ ] Directus health check OK
- [ ] Nginx proxy hoạt động
- [ ] Vercel deployment thành công
- [ ] Frontend kết nối được với API
- [ ] Authentication flow hoạt động
- [ ] File upload hoạt động

### 11.3. Post-deployment

- [ ] Smoke test các chức năng chính
- [ ] Kiểm tra responsive trên mobile
- [ ] Kiểm tra performance (Lighthouse)
- [ ] Health check monitoring hoạt động
- [ ] Backup cron job hoạt động
- [ ] SSL renewal tự động hoạt động

---

_Tài liệu kế hoạch triển khai - Hệ Thống Quản Lý Khoá Học Trực Tuyến_
