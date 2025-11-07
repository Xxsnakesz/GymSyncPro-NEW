# Panduan Deployment Idachi Fitness ke Server Sendiri

Dokumen ini menjelaskan cara menjalankan aplikasi Idachi Fitness di server Anda sendiri (VPS, cloud server, atau hosting lainnya).

## 📋 Persyaratan

### Software yang Dibutuhkan
- **Node.js** versi 18 atau lebih tinggi
- **PostgreSQL** versi 12 atau lebih tinggi
- **npm** atau **yarn** package manager
- **PM2** atau process manager lainnya (opsional, untuk production)

### Layanan Eksternal
1. **PostgreSQL Database** (wajib)
   - Bisa menggunakan Neon, Supabase, atau self-hosted
   
2. **Resend API** (wajib untuk fitur email)
   - Daftar di https://resend.com
   - Verifikasi domain untuk production
   
3. **Stripe** (opsional - untuk payment internasional)
   - Daftar di https://stripe.com
   
4. **Midtrans** (opsional - untuk payment Indonesia)
   - Daftar di https://midtrans.com

## 🚀 Langkah Deployment

### 1. Clone atau Upload Kode

Upload semua file aplikasi ke server Anda, atau clone dari repository:

```bash
# Jika menggunakan git
git clone <repository-url>
cd idachi-fitness

# Atau upload manual via FTP/SFTP
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Copy file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Kemudian edit file `.env` dengan nilai yang sesuai:

```env
# DATABASE (WAJIB)
DATABASE_URL=postgresql://username:password@host:port/database

# SERVER
PORT=5000
NODE_ENV=production
APP_URL=https://yourdomain.com

# SECURITY (WAJIB UNTUK PRODUCTION)
SESSION_SECRET=<generate-random-string-panjang>

# ADMIN
ADMIN_SECRET_KEY=<secret-key-untuk-admin-registration>

# EMAIL (WAJIB UNTUK FITUR EMAIL)
RESEND_API_KEY=re_xxxxxxxxxxxxx
# Default FROM (fallback jika stream khusus tidak diset)
RESEND_FROM_EMAIL=support@adityafajrian.my.id

# Stream terpisah (opsional tapi direkomendasikan):
# 1) Admin outbound (panel admin kirim ke member)
#    - gunakan alamat/identity berbeda (mis. support@ / hello@) dan opsional API key berbeda
RESEND_FROM_EMAIL_ADMIN=support@adityafajrian.my.id
RESEND_API_KEY_ADMIN=
RESEND_REPLY_TO_ADMIN=cs@adityafajrian.my.id

# 2) Verification (kode OTP/konfirmasi)
#    - gunakan alamat/identity berbeda (mis. no-reply@) dan opsional API key berbeda
RESEND_FROM_EMAIL_VERIFICATION=no-reply@adityafajrian.my.id
RESEND_API_KEY_VERIFICATION=

# PAYMENT (OPSIONAL)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLIC_KEY=pk_live_xxxxx

MIDTRANS_SERVER_KEY=xxxxx
MIDTRANS_CLIENT_KEY=xxxxx
MIDTRANS_ENVIRONMENT=production
```

#### Generate SESSION_SECRET

Gunakan command berikut untuk generate random string yang aman:

```bash
openssl rand -base64 32
```

### 4. Setup Database

Pastikan PostgreSQL sudah running dan buat database baru:

```sql
CREATE DATABASE idachi_fitness;
```

Kemudian jalankan migration untuk membuat tabel:

```bash
npm run db:push
```

#### Catatan: Kolom Poster Kelas (image_url)

Fitur poster untuk kelas membutuhkan kolom baru `image_url` pada tabel `gym_classes`. Jika Anda meng-upgrade dari versi sebelumnya, jalankan sinkronisasi schema agar kolom tersebut dibuat:

```powershell
# Windows PowerShell contoh (Neon/Supabase/PG):
# Pastikan sudah set DATABASE_URL di environment Anda
$env:DATABASE_URL = "postgresql://user:pass@host:5432/dbname"; npm run db:push
```

Jika Anda menggunakan shell lain atau CI, sesuaikan cara menyetel `DATABASE_URL` sebelum menjalankan `npm run db:push`.

Setelah migrasi, Admin dapat mengunggah gambar poster, dan server akan menyajikannya dari endpoint statis `/uploads/...`.

### 5. Setup Email (Resend)

1. Daftar di https://resend.com
2. Buat API key di https://resend.com/api-keys
3. Verifikasi domain Anda di https://resend.com/domains
4. Update `RESEND_API_KEY` dan `RESEND_FROM_EMAIL` di file `.env`

> **Penting**: Untuk production, Anda harus verifikasi domain. Email dari "onboarding@resend.dev" hanya untuk development.

#### Admin: Kirim Email Manual (Opsional)

Jika `RESEND_API_KEY` dan `RESEND_FROM_EMAIL` sudah dikonfigurasi, Admin dapat mengirim email ke member langsung dari halaman Admin → Members. Untuk pemisahan yang rapi agar tidak "tabrakan" dengan email verifikasi, Anda dapat menyetel variabel berikut:

- `RESEND_FROM_EMAIL_ADMIN` (+ opsional `RESEND_API_KEY_ADMIN`, `RESEND_REPLY_TO_ADMIN`)
- `RESEND_FROM_EMAIL_VERIFICATION` (+ opsional `RESEND_API_KEY_VERIFICATION`)

Aplikasi akan otomatis memakai stream yang sesuai: verifikasi menggunakan konfigurasi verifikasi, sedangkan email dari panel admin menggunakan konfigurasi admin.

### 6. Build Aplikasi

Build frontend dan backend:

```bash
npm run build
```

Ini akan menghasilkan:
- `dist/public/` - Frontend files
- `dist/index.js` - Backend server

### 7. Jalankan Aplikasi

#### Development Mode

```bash
npm run dev
```

#### Production Mode

Menggunakan npm:

```bash
npm start
```

Menggunakan PM2 (recommended):

```bash
# Install PM2 globally
npm install -g pm2

# Start aplikasi
pm2 start npm --name "idachi-fitness" -- start

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor logs
pm2 logs idachi-fitness
```

### 8. Setup Web Server (Nginx)

Untuk production, gunakan Nginx sebagai reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan HTTPS dengan Let's Encrypt:

```bash
sudo certbot --nginx -d yourdomain.com
```

### 9. Firewall Configuration

Pastikan port yang diperlukan terbuka:

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5432/tcp  # PostgreSQL (jika database di server yang sama)
sudo ufw enable
```

## 🔧 Konfigurasi Lanjutan

### WhatsApp Cloud API (Opsional)

Jika ingin Admin dapat mengirimkan pesan WhatsApp ke member langsung dari panel admin:

1. Daftar/aktifkan WhatsApp Cloud API di Meta for Developers.
2. Dapatkan Phone Number ID dan Permanent Token dari Meta Business.
3. Tambahkan environment variables berikut pada `.env`:

```env
WHATSAPP_TOKEN=EAAG... (permanent token)
WHATSAPP_PHONE_NUMBER_ID=123456789012345
```

Jika variabel ini belum diset, endpoint akan merespon 503 dan tombol di Admin tetap ada namun pengiriman akan gagal dengan pesan yang ramah.

Catatan: Sistem akan menormalkan nomor ke format E.164 Indonesia (+62...). Pastikan data `phone` member valid.

### Push Notifications (Opsional)

Jika ingin mengaktifkan push notifications:

```bash
# Generate VAPID keys
npx web-push generate-vapid-keys
```

Tambahkan ke `.env`:

```env
VAPID_PUBLIC_KEY=<public-key>
VAPID_PRIVATE_KEY=<private-key>
VAPID_MAILTO=mailto:admin@yourdomain.com
```

### Payment Gateway Setup

#### Stripe

1. Daftar di https://dashboard.stripe.com
2. Ambil API keys dari https://dashboard.stripe.com/apikeys
3. Setup webhook untuk production

#### Midtrans

1. Daftar di https://dashboard.midtrans.com
2. Ambil Server Key dan Client Key dari Settings > Access Keys
3. Set `MIDTRANS_ENVIRONMENT=production` untuk live transactions

## 📊 Monitoring & Maintenance

### Check Status Aplikasi

```bash
# Dengan PM2
pm2 status
pm2 logs idachi-fitness

# Dengan systemd
sudo systemctl status idachi-fitness
sudo journalctl -u idachi-fitness -f
```

### Database Backup

```bash
# Backup database
pg_dump -U username -d idachi_fitness > backup_$(date +%Y%m%d).sql

# Restore database
psql -U username -d idachi_fitness < backup_20231103.sql
```

### Update Aplikasi

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Restart
pm2 restart idachi-fitness
```

## ❓ Troubleshooting

### Error: "RESEND_API_KEY environment variable is required"

**Solusi**: Pastikan file `.env` berisi `RESEND_API_KEY` yang valid.

### Error: "Database connection failed"

**Solusi**: 
- Cek `DATABASE_URL` di file `.env`
- Pastikan PostgreSQL service running: `sudo systemctl status postgresql`
- Test koneksi: `psql -d <DATABASE_URL>`

### Error: "Port 5000 already in use"

**Solusi**: 
- Ganti `PORT` di file `.env` ke port lain (misal: 3000)
- Atau stop aplikasi yang menggunakan port 5000

### Email tidak terkirim

**Solusi**:
- Pastikan `RESEND_API_KEY` valid
- Verifikasi domain di Resend dashboard
- Check logs untuk error detail

## 🔐 Security Checklist

- [ ] `SESSION_SECRET` diset dengan random string yang kuat
- [ ] `NODE_ENV=production` di environment production
- [ ] Database menggunakan password yang kuat
- [ ] Firewall aktif dan hanya port yang diperlukan terbuka
- [ ] SSL/HTTPS aktif menggunakan Let's Encrypt
- [ ] Resend domain terverifikasi
- [ ] `ADMIN_SECRET_KEY` diganti dari default value
- [ ] File `.env` tidak di-commit ke git (ada di `.gitignore`)

## 📝 Catatan Penting

1. **File yang Tidak Digunakan**: File `server/replitAuth.ts.disabled` adalah backup dari sistem autentikasi Replit yang sudah tidak digunakan. Bisa dihapus jika tidak diperlukan.

2. **Vite Plugins**: Plugins `@replit/vite-plugin-*` hanya akan aktif jika `REPL_ID` environment variable ada. Di server sendiri, plugins ini tidak akan load - tidak masalah.

3. **Database Migration**: Gunakan `npm run db:push` untuk sync schema. Untuk production yang lebih aman, pertimbangkan menggunakan migration tools.

4. **Upload Gambar & Static Files**:
   - Endpoint admin untuk upload gambar tersedia di `POST /api/admin/upload-image` (hanya admin).
   - Berkas disimpan ke folder `uploads/` di root proyek. Server secara otomatis melayani file tersebut melalui path `/uploads/...`.
   - Pastikan disk memiliki izin tulis pada direktori aplikasi (khususnya folder `uploads`).

4. **Email Development**: Tanpa `RESEND_FROM_EMAIL`, sistem akan fallback ke "onboarding@resend.dev" yang hanya untuk development.

## 💡 Tips Optimization

### 1. Enable Gzip & Brotli Compression di Nginx

Edit file nginx config (`/etc/nginx/nginx.conf` atau site config):

```nginx
# Gzip Settings
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript 
           application/json application/javascript application/xml+rss 
           application/rss+xml font/truetype font/opentype 
           application/vnd.ms-fontobject image/svg+xml;

# Brotli Settings (jika modul tersedia)
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css text/xml text/javascript 
             application/json application/javascript application/xml+rss 
             application/rss+xml font/truetype font/opentype 
             application/vnd.ms-fontobject image/svg+xml;
```

Restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Setup CDN untuk Static Assets

#### Opsi A: Menggunakan Cloudflare (Gratis)

1. **Signup di Cloudflare**:
   - Daftar di https://cloudflare.com
   - Tambahkan domain Anda
   - Update nameserver domain ke Cloudflare

2. **Enable Cache Everything**:
   - Dashboard > Rules > Page Rules
   - Create Rule: `yourdomain.com/dist/*` → Cache Level: Cache Everything
   - Create Rule: `yourdomain.com/*.js` → Cache Level: Cache Everything
   - Create Rule: `yourdomain.com/*.css` → Cache Level: Cache Everything

3. **Enable Auto Minify**:
   - Speed > Optimization
   - Enable Auto Minify untuk JS, CSS, dan HTML

4. **Enable Brotli**:
   - Speed > Optimization
   - Enable Brotli compression

#### Opsi B: Menggunakan CDN Terpisah (BunnyCDN, KeyCDN, dll)

1. **Setup Pull Zone**:
   ```
   Origin URL: https://yourdomain.com
   Pull Zone URL: https://cdn.yourdomain.com
   ```

2. **Update Build Output untuk CDN**:
   
   Buat file `vite.config.cdn.ts`:
   ```typescript
   import { defineConfig } from "vite";
   import react from "@vitejs/plugin-react";
   import path from "path";
   
   export default defineConfig({
     plugins: [react()],
     base: "https://cdn.yourdomain.com/",
     build: {
       outDir: "dist/public",
       assetsDir: "assets",
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             ui: ['@radix-ui/react-dialog', '@radix-ui/react-toast']
           }
         }
       }
     }
   });
   ```

3. **Build dengan CDN Config**:
   ```bash
   vite build --config vite.config.cdn.ts
   ```

4. **Upload `dist/public` ke CDN Origin**

### 3. Cache Control Headers di Nginx

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /dist/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 4. Database Connection Pooling

Update connection di `.env`:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db?pool_timeout=60&connect_timeout=10
```

### 5. Monitor Memory Usage

```bash
# Dengan PM2
pm2 monit

# Setup PM2 monitoring dashboard
pm2 install pm2-server-monit
```

### 6. Automated Database Backups

Buat cron job untuk backup otomatis:
```bash
# Edit crontab
crontab -e

# Tambahkan (backup setiap hari jam 2 pagi)
0 2 * * * pg_dump -U username -d idachi_fitness > /backup/db_$(date +\%Y\%m\%d).sql
```

### 7. Production Build Optimization

Install compression plugin:
```bash
npm install -D vite-plugin-compression
```

Saat build, assets akan otomatis di-compress menjadi `.gz` dan `.br` files.

Nginx akan otomatis serve compressed version jika browser support.

## 📞 Bantuan

Jika mengalami kendala dalam deployment, check:
- Application logs: `pm2 logs idachi-fitness`
- Nginx logs: `/var/log/nginx/error.log`
- PostgreSQL logs: `/var/log/postgresql/`

---

**Deployment berhasil?** Akses aplikasi di `https://yourdomain.com` dan test semua fitur!
