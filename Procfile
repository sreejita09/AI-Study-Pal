web: gunicorn -w 4 -b 0.0.0.0:$PORT app:app
release: python -c "from app import create_runtime_app; from models import db; app = create_runtime_app(); app.app_context().push(); db.create_all()"
