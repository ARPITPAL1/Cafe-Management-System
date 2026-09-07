import os
import sys
from pathlib import Path
import shutil

CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = CURRENT_DIR.parent
if (REPO_ROOT / 'backend').exists():
    BACKEND_DIR = REPO_ROOT / 'backend'
elif (REPO_ROOT / 'frontend' / 'backend').exists():
    BACKEND_DIR = REPO_ROOT / 'frontend' / 'backend'
else:
    BACKEND_DIR = CURRENT_DIR.parent

sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cafe_project.settings')

seed_db = BACKEND_DIR / 'db.sqlite3'
tmp_dir = Path('/tmp')
if tmp_dir.exists() and (os.environ.get('VERCEL') or os.name != 'nt'):
    tmp_db = tmp_dir / 'db.sqlite3'
    if not tmp_db.exists() and seed_db.exists():
        try:
            shutil.copy2(seed_db, tmp_db)
        except Exception as e:
            print(f"Error copying db.sqlite3 to /tmp: {e}")

import django
django.setup()

from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()
