# Quick Start Guide - AI Study Pal

Get the AI Study Pal application running locally or deployed to production.

## Local Development (5 minutes)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Create .env File
Create a `.env` file in the project root with:
```env
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URL=sqlite:///study_pal.db
SECRET_KEY=dev-key-change-this-in-production
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=your-email@gmail.com
```

*See [ENV_SETUP.md](ENV_SETUP.md) for detailed configuration.*

### 3. Run the Application
```bash
python app.py
```

The app will be available at: **http://127.0.0.1:5000**

### 4. Test Locally
- Go to http://127.0.0.1:5000
- Click "Register"
- Create a test account
- Upload a study material
- Generate a study plan

---

## What's Included

### Learning Optimization Engine
- **Topic Extraction**: Automatically identifies key topics from your materials
- **Knowledge Graph**: Builds prerequisite chains to ensure correct learning order
- **Difficulty Estimation**: Assesses material complexity
- **Strategy Engine**: Suggests optimal learning strategies
- **Smart Scheduler**: Creates realistic study schedules with spaced repetition
- **Action Generator**: Creates specific, actionable study tasks

### File Support
- PDF documents
- Word documents (.docx)
- CSV files
- Plain text files
- Images with OCR

### Features
- User registration with email verification
- Real-time username availability checking
- File upload and parsing
- AI-powered study plan generation
- Dark theme interface
- Responsive design

---

## Deploying to Production (Pick One)

### Option A: Heroku (Easiest - ~10 minutes)

**Prerequisites:** Heroku account, Heroku CLI

1. **Create Heroku app:**
   ```bash
   heroku login
   heroku create your-app-name
   ```

2. **Add PostgreSQL:**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set FLASK_ENV=production
   heroku config:set SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
   heroku config:set MAIL_USERNAME=your-email@gmail.com
   heroku config:set MAIL_PASSWORD=your-app-password
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

5. **Open app:**
   ```bash
   heroku open
   ```

**Result:** Your app will be live at `https://your-app-name.herokuapp.com`

---

### Option B: DigitalOcean ($6/month - ~30 minutes)

**Prerequisites:** DigitalOcean account, Ubuntu 22.04 Droplet

*See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) Section "Option 4: DigitalOcean" for full instructions*

Quick summary:
1. SSH into droplet
2. Install Python, PostgreSQL, Nginx
3. Clone repository
4. Install dependencies in virtual environment
5. Configure Gunicorn and Nginx
6. Setup SSL with Let's Encrypt
7. Deploy

**Result:** Your app runs on your own server with custom domain

---

### Option C: PythonAnywhere (Free tier available - ~15 minutes)

1. Sign up at pythonanywhere.com
2. Create web app (Python 3.11 + Flask)
3. Upload code via Git
4. Configure virtual environment
5. Set up database

*See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) Section "Option 2: PythonAnywhere" for detailed steps*

**Result:** Your app lives on pythonanywhere.com subdomain (free) or custom domain

---

### Option D: AWS Elastic Beanstalk (Production-grade)

*See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) Section "Option 3: AWS"*

---

## File Structure

```
ai-study-pal/
├── app.py                           # Main Flask application
├── config.py                        # Configuration management
├── models.py                        # Database models (User, StudyPlan)
├── requirements.txt                 # Python dependencies
├── .env                            # Environment variables (create manually)
│
├── routes/                          # API endpoints
│   ├── __init__.py
│   ├── main.py                      # Dashboard, plan generation
│   └── auth.py                      # Registration, login
│
├── services/                        # Learning optimization core
│   ├── learning_optimizer.py        # Main orchestrator
│   ├── topic_extractor.py          # Extract topics from materials
│   ├── knowledge_graph.py           # Build prerequisite chains
│   ├── subject_classifier.py        # Classify subject types
│   ├── difficulty_estimator.py      # Assess complexity
│   ├── strategy_engine.py           # Learning strategies
│   ├── scheduler.py                 # Create schedules
│   ├── action_generator.py          # Generate specific tasks
│   ├── feedback_hook.py             # Collect performance data
│   ├── file_parser.py               # Parse PDF/DOCX/CSV
│   ├── summarizer.py                # Summarize content
│   ├── quiz_generator.py            # Create quiz questions
│   ├── tips_generator.py            # Study tips
│   └── __init__.py
│
├── static/                          # Frontend assets
│   ├── css/
│   │   └── style.css
│   └── js/ (optional)
│
├── templates/                       # HTML templates
│   ├── index.html                   # Landing page
│   ├── auth.html                    # Register/login
│   ├── dashboard.html               # Main app
│   └── base.html                    # Base layout
│
├── data/
│   └── plan.csv                     # Sample data
│
├── DEPLOYMENT_GUIDE.md              # Deployment instructions
├── ENV_SETUP.md                     # Environment configuration
├── LEARNING_OPTIMIZER_README.md     # Engine documentation
└── Procfile                         # Heroku deployment config
```

---

## Development Workflow

### Making Changes
1. Edit code
2. Flask auto-reloads (if FLASK_DEBUG=True)
3. Test at http://127.0.0.1:5000

### Common Development Tasks

**Add a new dependency:**
```bash
pip install package-name
pip freeze > requirements.txt
```

**Reset database:**
```bash
# Delete existing database
rm study_pal.db

# Restart app - it will auto-create new database
python app.py
```

**Debug database issues:**
```python
from app import create_app
from models import db, User

app = create_app()
with app.app_context():
    # List all tables
    print(db.metadata.tables.keys())
    
    # Check users
    users = User.query.all()
    print(f"Total users: {len(users)}")
```

---

## API Endpoints (For Reference)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | Landing page |
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login |
| POST | `/auth/check-username` | Check username availability |
| GET | `/dashboard` | Main app interface |
| POST | `/generate_optimized_plan` | Generate study plan |
| GET | `/logout` | Logout user |

---

## Troubleshooting

### "Module not found" Error
```bash
pip install -r requirements.txt
```

### Database locks
```bash
rm study_pal.db
```

### Port already in use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process (replace PID)
kill -9 PID

# Or use different port
python -c "import os; os.environ['FLASK_PORT'] = '5001'; exec(open('app.py').read())"
```

### Email not sending
1. Verify `.env` MAIL variables are correct
2. Use app-specific password for Gmail (not account password)
3. Enable "Less secure app" if needed
4. Check spam folder

### Page not loading
1. Check console for JavaScript errors
2. Check Flask terminal for Python errors
3. Verify `templates/` folder exists with HTML files

---

## Next Steps

1. **Test locally**: Run app and create test account
2. **Customize**: Update appearance in `templates/` and `static/css/`
3. **Choose hosting**: Pick Heroku, DigitalOcean, or PythonAnywhere
4. **Configure**: Update `.env` with production values
5. **Deploy**: Follow deployment option steps
6. **Monitor**: Check logs and error rates

---

## Support Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Heroku Documentation](https://devcenter.heroku.com/)
- [LEARNING_OPTIMIZER_README.md](LEARNING_OPTIMIZER_README.md) - Engine details

---

## Useful Commands Reference

```bash
# Start development server
python app.py

# Install dependencies
pip install -r requirements.txt

# Update requirements
pip freeze > requirements.txt

# Run tests
pytest

# Database initialization
python -c "from app import create_app; from models import db; app = create_app(); app.app_context().push(); db.create_all()"

# Heroku deployment
heroku login
heroku create app-name
heroku config:set KEY=value
git push heroku main

# View Heroku logs
heroku logs --tail
```

---

**Happy Learning! 🚀**

For detailed information, see:
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Deployment options
- [ENV_SETUP.md](ENV_SETUP.md) - Configuration details
- [LEARNING_OPTIMIZER_README.md](LEARNING_OPTIMIZER_README.md) - Engine documentation
