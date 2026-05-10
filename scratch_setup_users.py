import os
import django

# Set up Django environment using production settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.production')
django.setup()

from clinic.models import User

# 1. Fix sys.admin role to ADMIN
try:
    admin_user = User.objects.get(username='sys.admin')
    admin_user.role = User.Role.ADMIN
    admin_user.save()
    print("Successfully updated sys.admin role to ADMIN")
except User.DoesNotExist:
    print("Warning: sys.admin user not found")

# 2. Create Doctor
doc, created = User.objects.get_or_create(username='dr.annabmayor', defaults={
    'email': 'dr.annabmayor@catc.edu.ph',
    'role': User.Role.DOCTOR
})
if created:
    doc.set_password('C@re-Doc_2026!#')
    doc.save()
    print("Successfully created doctor account: dr.annabmayor")
else:
    doc.set_password('C@re-Doc_2026!#')
    doc.role = User.Role.DOCTOR
    doc.save()
    print("Successfully updated doctor account: dr.annabmayor")

# 3. Create Nurse
nurse, created = User.objects.get_or_create(username='rn.offemaria', defaults={
    'email': 'rn.offemaria@catc.edu.ph',
    'role': User.Role.NURSE
})
if created:
    nurse.set_password('Nurs3-C@tc_2026&*')
    nurse.save()
    print("Successfully created nurse account: rn.offemaria")
else:
    nurse.set_password('Nurs3-C@tc_2026&*')
    nurse.role = User.Role.NURSE
    nurse.save()
    print("Successfully updated nurse account: rn.offemaria")
