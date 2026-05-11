# Deploy VPS (Next.js + PM2 + Nginx)

Tài liệu này dành cho dự án `furniture-ecm` khi deploy lên VPS Ubuntu.

## 1) Chuẩn bị VPS

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

## 2) Clone code

```bash
sudo mkdir -p /var/www/furniture-ecm
sudo chown -R $USER:$USER /var/www/furniture-ecm
cd /var/www/furniture-ecm
git clone <your-repo-url> current
cd current
```

## 3) Khai báo ENV (quan trọng)

ENV đặt **trên VPS**, không commit vào git.

```bash
cp env.production.example .env
nano .env
```

Điền tối thiểu:
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `REDIS_URL` (nếu dùng queue/cache)
- các key Cloudinary/Google theo tính năng bạn bật.

## 4) Build app

```bash
npm ci
npm run build
```

## 5) Chạy bằng PM2

File PM2 mẫu đã có sẵn: `ecosystem.config.cjs`.

```bash
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs furniture-ecm-web --lines 200
```

Để PM2 tự chạy khi reboot:

```bash
pm2 startup
pm2 save
```

## 6) Cấu hình Nginx reverse proxy

1. Sửa domain trong `deploy/nginx.furniture-ecm.conf` (`example.com`).
2. Copy vào sites-available:

```bash
sudo cp deploy/nginx.furniture-ecm.conf /etc/nginx/sites-available/furniture-ecm
sudo ln -s /etc/nginx/sites-available/furniture-ecm /etc/nginx/sites-enabled/furniture-ecm
sudo nginx -t
sudo systemctl reload nginx
```

## 7) Bật HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

## 8) Quy trình update bản mới

```bash
cd /var/www/furniture-ecm/current
git pull
npm ci
npm run build
pm2 restart ecosystem.config.cjs --update-env
pm2 status
```

## 9) Lệnh kiểm tra nhanh

```bash
pm2 status
pm2 logs furniture-ecm-web --lines 100
sudo systemctl status nginx
curl -I http://127.0.0.1:3000
```

## 10) Phương án Docker (thay cho PM2)

Repo đã có sẵn:
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`

### Cài Docker trên VPS

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# logout/login lại để nhận group docker
```

### Chạy app bằng Docker Compose

```bash
cd /var/www/furniture-ecm/current
cp env.production.example .env
nano .env
docker compose up -d --build
docker compose ps
docker compose logs -f web
```

App chạy ở `127.0.0.1:3000`, Nginx vẫn reverse proxy như cấu hình ở trên.

### Update bản mới (Docker)

```bash
cd /var/www/furniture-ecm/current
git pull
docker compose up -d --build
docker image prune -f
```

## Ghi chú

- Muốn chạy worker nền: mở comment app `furniture-ecm-worker` trong `ecosystem.config.cjs`, sau đó `pm2 restart ecosystem.config.cjs`.
- Nếu đổi ENV: restart bằng `pm2 restart ecosystem.config.cjs --update-env`.
