# Environment Configuration Setup

This guide explains how to configure the `.env` file for different deployment environments.

## File Location
Create or edit `.env` in the project root directory:
```
ai-study-pal/
├── app.py
├── .env              ← Create this file
├── .env.example      ← Template (don't edit)
└── ...
```

## Step-by-Step Configuration

### 1. Generate SECRET_KEY

This is a cryptographic key used to secure sessions and tokens.

**On Linux/macOS:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**On Windows (PowerShell):**
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the output and add to `.env`:
```
SECRET_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

---

### 2. Configure Database

#### Development (SQLite)
```env
DATABASE_URL=sqlite:///study_pal.db
```

#### Production (PostgreSQL)
You'll need a PostgreSQL database. Get credentials from your hosting provider.

```env
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
```

**Example:**
```env
DATABASE_URL=postgresql://aipal:mypassword123@db.postgresql.com:5432/ai_study_pal
```

---

### 3. Configure Email (Flask-Mail)

#### Using Gmail

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password:**
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Search for "App passwords"
   - Create app password for "Mail" on "Windows Computer"
   - Copy the 16-character password

3. **Add to `.env`:**
   ```env
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USE_TLS=True
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=xxxx xxxx xxxx xxxx
   MAIL_DEFAULT_SENDER=your-email@gmail.com
   ```

#### Using SendGrid

1. Create SendGrid account at sendgrid.com
2. Get API key from Settings
3. **Add to `.env`:**
   ```env
   MAIL_SERVER=smtp.sendgrid.net
   MAIL_PORT=587
   MAIL_USE_TLS=True
   MAIL_USERNAME=apikey
   MAIL_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   MAIL_DEFAULT_SENDER=noreply@yourdomain.com
   ```

#### Using AWS SES

1. Verify email in SES console
2. Get SMTP credentials
3. **Add to `.env`:**
   ```env
   MAIL_SERVER=email-smtp.region.amazonaws.com
   MAIL_PORT=587
   MAIL_USE_TLS=True
   MAIL_USERNAME=AKIA...
   MAIL_PASSWORD=xxxx...
   MAIL_DEFAULT_SENDER=noreply@yourdomain.com
   ```

---

### 4. Flask Configuration

```env
# Required
FLASK_APP=app.py
FLASK_ENV=production

# Optional but recommended for production
FLASK_DEBUG=False
```

---

### 5. Session Security (Production Only)

```env
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax
```

---

## Complete .env File Example

### Development
```env
# Flask Config
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=True

# Database
DATABASE_URL=sqlite:///study_pal.db

# Security
SECRET_KEY=your-secret-key-here

# Email (Gmail)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=your-email@gmail.com

# Session
SESSION_COOKIE_SECURE=False
SESSION_COOKIE_HTTPONLY=True
```

### Production
```env
# Flask Config
FLASK_APP=app.py
FLASK_ENV=production
FLASK_DEBUG=False

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Security (Must use strong values!)
SECRET_KEY=very-long-random-string-of-64-characters
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax

# Email (SendGrid or AWS SES recommended)
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=apikey
MAIL_PASSWORD=SG.your-sendgrid-api-key
MAIL_DEFAULT_SENDER=noreply@yourdomain.com

# Optional: Analytics, Error Tracking
SENTRY_DSN=your-sentry-dsn-url (optional)
```

---

## Loading .env in Code

The application automatically loads `.env` using `python-dotenv`:

```python
from dotenv import load_dotenv
load_dotenv()

import os
secret_key = os.getenv('SECRET_KEY')
database_url = os.getenv('DATABASE_URL')
```

---

## Deploying with .env

### Heroku
```bash
heroku config:set SECRET_KEY=your-key
heroku config:set DATABASE_URL=postgresql://...
heroku config:set MAIL_SERVER=smtp.gmail.com
# ... set other variables
```

### Docker
```bash
docker run -e SECRET_KEY=your-key -e DATABASE_URL=postgresql://... aipal:latest
```

### Traditional VPS
Create `/var/www/ai-study-pal/.env` with your configuration

### PythonAnywhere
Add environment variables in Web app settings

---

## Security Checklist

- [ ] SECRET_KEY is 32+ characters and random
- [ ] DATABASE_URL has strong password
- [ ] MAIL_PASSWORD uses app-specific password (not account password)
- [ ] SESSION_COOKIE_SECURE=True in production
- [ ] .env is added to `.gitignore` (never commit secrets!)
- [ ] All environment variables are set on production server

---

## Verifying Configuration

### Test email configuration:
```python
from flask_mail import Mail, Message
from flask import Flask

app = Flask(__name__)
app.config.from_object('config.Config')
mail = Mail(app)

try:
    msg = Message('Test Email', recipients=['your-email@example.com'])
    msg.body = 'Testing email configuration'
    mail.send(msg)
    print("✓ Email sent successfully!")
except Exception as e:
    print(f"✗ Email error: {e}")
```

### Test database connection:
```python
from app import create_app
from models import db

app = create_app()
with app.app_context():
    try:
        db.create_all()
        print("✓ Database connected successfully!")
    except Exception as e:
        print(f"✗ Database error: {e}")
```

---

## Resetting Configuration

To start over:
1. Delete `.env`
2. Copy from `.env.example`
3. Run through this guide again

---

## Common Issues

### "ModuleNotFoundError: No module named 'dotenv'"
```bash
pip install python-dotenv
```

### "Invalid DATABASE_URL"
- Check PostgreSQL connection string format
- Verify hostname is correct
- Ensure password doesn't contain special characters (URL encode if needed)

### "Email not sending"
- Verify MAIL_USERNAME and MAIL_PASSWORD are correct
- Check MAIL_SERVER address is correct
- Test with a simple Python script

### "SECRET_KEY not set"
- Ensure .env file exists in project root
- Reload the application after creating .env
- Check file permissions

---

**Tips:**
- Keep different .env files for different environments
- Use `.env.production` naming convention for clarity
- Never share .env file or commit to version control
- Use environment variables on hosting platforms instead of .env files
