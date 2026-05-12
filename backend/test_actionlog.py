import os
import django
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / '.env'
load_dotenv(env_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.base')
# Adjust path to backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
django.setup()

from clinic.models import ActionLog, LoginLog
from django.utils import timezone

try:
    print("Trying to create ActionLog...")
    log = ActionLog.objects.create(action="Test Action", entity_type="Test")
    print("Success! Log ID:", log.id)
    log.delete()
except Exception as e:
    print("Failed to create ActionLog:", str(e))
