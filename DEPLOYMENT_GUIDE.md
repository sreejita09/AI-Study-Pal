# AI Study Pal - Deployment Guide

This guide walks you through deploying the AI Study Pal application to production using various platforms.

## Pre-Deployment Checklist

- [ ] Update SECRET_KEY in .env
- [ ] Configure email settings (MAIL_USERNAME, MAIL_PASSWORD)
- [ ] Create production database (PostgreSQL recommended)
- [ ] Set FLASK_ENV=production
- [ ] Enable HTTPS/SSL
- [ ] Set SESSION_COOKIE_SECURE=True
- [ ] Test all features locally first

## Option 1: Deploy to Heroku (Easiest)

### Prerequisites
- Heroku account (sign up at heroku.com)
- Heroku CLI installed
- Git installed
- PostgreSQL database (Heroku Postgres add-on)

### Steps

1. **Login to Heroku:**
   ```bash
   heroku login
   ```

2. **Create a new Heroku app:**
   ```bash
   heroku create your-app-name
   ```

3. **Add PostgreSQL database:**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

4. **Set environment variables:**
   ```bash
   heroku config:set FLASK_ENV=production
   heroku config:set SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
   heroku config:set MAIL_SERVER=smtp.gmail.com
   heroku config:set MAIL_PORT=587
   heroku config:set MAIL_USE_TLS=True
   heroku config:set MAIL_USERNAME=your-email@gmail.com
   heroku config:set MAIL_PASSWORD=your-app-password
   ```

5. **Deploy:**
   ```bash
   git push heroku main
   ```

6. **Open the app:**
   ```bash
   heroku open
   ```

### Database Setup on Heroku

The Procfile includes a release command that automatically runs `db.create_all()` on deployment, creating all tables automatically.

---

## Option 2: Deploy to PythonAnywhere (Simple)

### Steps

1. **Sign up at pythonanywhere.com**

2. **Upload files:**
   - Upload your project files via the web interface or using Git

3. **Create a virtual environment:**
   ```bash
   mkvirtualenv --python=/usr/bin/python3.11 aipal
   pip install -r requirements.txt
   ```

4. **Configure Web App:**
   - Create a new web app (Python 3.11 + Flask)
   - Point to your WSGI file

5. **Set environment variables:**
   - Edit `.env` file with your configuration

6. **Reload the web app**

---

## Option 3: Deploy to AWS (Production-Grade)

### Using Elastic Beanstalk

1. **Install EB CLI:**
   ```bash
   pip install awsebcli
   ```

2. **Initialize EB application:**
   ```bash
   eb init -p python-3.11 ai-study-pal --region us-east-1
   ```

3. **Create environment:**
   ```bash
   eb create production
   ```

4. **Set environment variables:**
   ```bash
   eb setenv FLASK_ENV=production SECRET_KEY=your-key MAIL_USERNAME=... MAIL_PASSWORD=...
   ```

5. **Deploy:**
   ```bash
   eb deploy
   ```

### Using RDS for Database

1. Create PostgreSQL instance in RDS
2. Update DATABASE_URL in .env
3. Run migrations:
   ```bash
   eb ssh
   python -c "from app import create_app; from models import db; app = create_app(); app.app_context().push(); db.create_all()"
   ```

---

## Option 4: Deploy to DigitalOcean (Virtual Server)

### Prerequisites
- DigitalOcean account
- Droplet with Ubuntu 22.04 LTS

### Steps

1. **SSH into droplet:**
   ```bash
   ssh root@your-droplet-ip
   ```

2. **Update system:**
   ```bash
   apt update && apt upgrade -y
   ```

3. **Install dependencies:**
   ```bash
   apt install -y python3.11 python3-pip postgresql postgresql-contrib nginx supervisor certbot python3-certbot-nginx
   ```

4. **Clone your repository:**
   ```bash
   cd /var/www
   git clone your-repo-url ai-study-pal
   cd ai-study-pal
   ```

5. **Create virtual environment:**
   ```bash
   python3.11 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

6. **Configure PostgreSQL:**
   ```bash
   sudo -u postgres createdb ai_study_pal
   sudo -u postgres createuser aipal
   ```

7. **Create .env file:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   nano .env
   ```

8. **Run database migrations:**
   ```bash
   python -c "from app import create_app; from models import db; app = create_app(); app.app_context().push(); db.create_all()"
   ```

9. **Configure Gunicorn (create `/etc/systemd/system/aipal.service`):**
   ```ini
   [Unit]
   Description=AI Study Pal Flask App
   After=network.target

   [Service]
   User=www-data
   WorkingDirectory=/var/www/ai-study-pal
   Environment="PATH=/var/www/ai-study-pal/venv/bin"
   ExecStart=/var/www/ai-study-pal/venv/bin/gunicorn -w 4 -b localhost:8000 app:app

   [Install]
   WantedBy=multi-user.target
   ```

10. **Start Gunicorn:**
    ```bash
    systemctl daemon-reload
    systemctl start aipal
    systemctl enable aipal
    ```

11. **Configure Nginx (create `/etc/nginx/sites-available/aipal`):**
    ```nginx
    server {
        listen 80;
        server_name your-domain.com;

        location / {
            proxy_pass http://localhost:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /static {
            alias /var/www/ai-study-pal/static;
        }
    }
    ```

12. **Enable Nginx site:**
    ```bash
    ln -s /etc/nginx/sites-available/aipal /etc/nginx/sites-enabled/
    nginx -t
    systemctl restart nginx
    ```

13. **Setup SSL with Let's Encrypt:**
    ```bash
    certbot --nginx -d your-domain.com
    ```

---

## Production Best Practices

### 1. Security
- Always use HTTPS
- Set SESSION_COOKIE_SECURE=True
- Use strong SECRET_KEY
- Keep dependencies updated
- Use environment variables for secrets

### 2. Database
- Use PostgreSQL in production (not SQLite)
- Regular backups
- Connection pooling (PgBouncer)
- Monitor database performance

### 3. Email
- Use dedicated SMTP service (Gmail, SendGrid, AWS SES)
- Add email logging
- Monitor delivery rates

### 4. Monitoring
- Set up error logging (Sentry, LogRocket)
- Monitor uptime (UptimeRobot)
- Track performance metrics
- Set up alerts for errors

### 5. Scaling
- Use CDN for static files (CloudFlare, AWS CloudFront)
- Enable gzip compression
- Cache API responses where possible
- Consider Redis for sessions/caching

### 6. Backups
- Daily database backups
- Version control for code
- Test backup restoration regularly

---

## Post-Deployment

1. **Test the deployment:**
   - Create test account
   - Upload sample materials
   - Generate study plans
   - Verify email delivery

2. **Monitor logs:**
   - Check application logs
   - Monitor error rates
   - Track user activity

3. **Setup domain:**
   - Update DNS records
   - Configure email records (SPF, DKIM)
   - Test email deliverability

4. **Performance optimization:**
   - Enable gzip compression
   - Minify static assets
   - Set up caching headers
   - Monitor response times

---

## Troubleshooting

### Database Connection Issues
```bash
# Check database URL format
# For PostgreSQL: postgresql://user:password@host:port/database
# For SQLite: sqlite:///study_pal.db
```

### Email Not Sending
- Verify MAIL_USERNAME and MAIL_PASSWORD
- Check Gmail app-specific password (not regular password)
- Enable "Less secure app access" if needed
- Check spam folder

### Static Files Not Loading
- Run `python manage.py collectstatic` (if using Django)
- Check Nginx configuration for static folder path
- Verify file permissions

### High Memory Usage
- Check number of Gunicorn workers (reduce if needed)
- Monitor database connections
- Enable connection pooling

---

## Quick Reference Commands

```bash
# Local development
export FLASK_ENV=development
export DATABASE_URL=sqlite:///study_pal.db
python app.py

# Production with Gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app

# Database initialization
python -c "from app import create_app; from models import db; app = create_app(); app.app_context().push(); db.create_all()"

# Check Heroku logs
heroku logs --tail

# SSH into Heroku dyno
heroku ps:exec
```

---

## Support

For issues or questions:
1. Check application logs
2. Review error messages carefully
3. Test locally first
4. Contact hosting provider support

---

**Last Updated:** March 26, 2026
