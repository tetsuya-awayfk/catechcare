import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.base')
django.setup()

from clinic.models import User
client = Client()

# Create superuser if not exists
if not User.objects.filter(username='admin_test').exists():
    User.objects.create_superuser('admin_test', 'admin@test.com', 'password123')

# Login
client.login(username='admin_test', password='password123')

# Request Student Admin
response = client.get('/admin/clinic/student/')
print("Student Status Code:", response.status_code)
if response.status_code == 500:
    print(response.content.decode('utf-8'))

# Request User Admin
response2 = client.get('/admin/clinic/user/')
print("User Status Code:", response2.status_code)
if response2.status_code == 500:
    print(response2.content.decode('utf-8'))
