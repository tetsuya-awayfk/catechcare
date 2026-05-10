import json
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from django.utils import timezone
from .models import LoginLog, ActionLog, Student, TeachingStaff, NonTeachingStaff, StudentVital, TeachingStaffVital, NonTeachingStaffVital, PatientArchive
from django.db.models.signals import post_save, post_delete

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    ip_address = get_client_ip(request) if request else None
    LoginLog.objects.create(
        user=user,
        ip_address=ip_address,
        status='SUCCESS'
    )

@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    # Find the most recent active login log for this user lacking a logout time
    if user:
        last_login = LoginLog.objects.filter(user=user, logout_time__isnull=True).order_by('-login_time').first()
        if last_login:
            last_login.logout_time = timezone.now()
            last_login.save()

# Action log helper
def create_action_log(instance, action_name, is_creation=False):
    entity_id = None
    if hasattr(instance, 'patient_id'):
        entity_id = instance.patient_id
    elif hasattr(instance, 'id'):
        entity_id = str(instance.id)

    # Determine type
    entity_type = instance.__class__.__name__

    details = "Creation" if is_creation else "Update"

    # Attempt to gracefully extract user if available via middleware or explicitly set on model
    # Usually in post_save, there's no request object, so the user might need to be set on the object via views.
    user_obj = getattr(instance, 'last_modified_by', None)
    if not user_obj and hasattr(instance, 'recorded_by'):
        user_obj = instance.recorded_by

    ActionLog.objects.create(
        user=user_obj,
        action=action_name,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details
    )

# Connect signals for Patients
PATIENT_MODELS = [Student, TeachingStaff, NonTeachingStaff]

for model in PATIENT_MODELS:
    @receiver(post_save, sender=model)
    def patient_saved(sender, instance, created, **kwargs):
        action = "Registered Patient" if created else "Modified Patient"
        create_action_log(instance, action, created)

    @receiver(post_delete, sender=model)
    def patient_deleted(sender, instance, **kwargs):
        create_action_log(instance, "Deleted Patient")

# Vitals
VITAL_MODELS = [StudentVital, TeachingStaffVital, NonTeachingStaffVital]

for model in VITAL_MODELS:
    @receiver(post_save, sender=model)
    def vital_saved(sender, instance, created, **kwargs):
        action = "New Vital" if created else "Updated Vital"
        create_action_log(instance, action, created)

@receiver(post_save, sender=PatientArchive)
def archive_saved(sender, instance, created, **kwargs):
    if created:
        create_action_log(instance, "Archived Patient", True)
