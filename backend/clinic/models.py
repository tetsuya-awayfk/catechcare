from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        DOCTOR = 'DOCTOR', 'Doctor'
        NURSE = 'NURSE', 'Nurse'

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.NURSE
    )

    def __str__(self):
        return f"{self.username} ({self.role})"

class Sex(models.TextChoices):
    MALE = 'MALE', 'Male'
    FEMALE = 'FEMALE', 'Female'

class CivilStatus(models.TextChoices):
    SINGLE = 'SINGLE', 'Single'
    MARRIED = 'MARRIED', 'Married'
    WIDOWED = 'WIDOWED', 'Widowed'

class Status(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'

class Student(models.Model):
    patient_id = models.CharField(max_length=20, unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_initial = models.CharField(max_length=1, blank=True, null=True)
    suffix = models.CharField(max_length=20, blank=True, null=True)
    course = models.CharField(max_length=100, blank=True, null=True)
    year_level = models.CharField(max_length=20, blank=True, null=True)
    birth_date = models.DateField(null=True, blank=True)
    sex = models.CharField(max_length=10, choices=Sex.choices, null=True, blank=True)
    civil_status = models.CharField(max_length=10, choices=CivilStatus.choices, null=True, blank=True)
    clinical_notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"patients"."clinic_student"'

    @property
    def category(self):
        return 'STUDENT'

    def __str__(self):
        return f"{self.last_name}, {self.first_name} ({self.patient_id})"

class TeachingStaff(models.Model):
    patient_id = models.CharField(max_length=20, unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_initial = models.CharField(max_length=1, blank=True, null=True)
    suffix = models.CharField(max_length=20, blank=True, null=True)
    birth_date = models.DateField(null=True, blank=True)
    sex = models.CharField(max_length=10, choices=Sex.choices, null=True, blank=True)
    civil_status = models.CharField(max_length=10, choices=CivilStatus.choices, null=True, blank=True)
    clinical_notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"patients"."clinic_teaching_staff"'

    @property
    def category(self):
        return 'TEACHING_STAFF'

    def __str__(self):
        return f"{self.last_name}, {self.first_name} ({self.patient_id})"

class NonTeachingStaff(models.Model):
    patient_id = models.CharField(max_length=20, unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_initial = models.CharField(max_length=1, blank=True, null=True)
    suffix = models.CharField(max_length=20, blank=True, null=True)
    birth_date = models.DateField(null=True, blank=True)
    sex = models.CharField(max_length=10, choices=Sex.choices, null=True, blank=True)
    civil_status = models.CharField(max_length=10, choices=CivilStatus.choices, null=True, blank=True)
    clinical_notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"patients"."clinic_non_teaching_staff"'

    @property
    def category(self):
        return 'NON_TEACHING_STAFF'

    def __str__(self):
        return f"{self.last_name}, {self.first_name} ({self.patient_id})"

# Base Functions for Vitals logic (Not fields, just methods)
class VitalLogicMixin:
    def check_for_alerts(self):
        if self.heart_rate == 0 and self.blood_pressure_systolic == 0 and self.blood_pressure_diastolic == 0 and self.oxygen_saturation == 0 and self.body_temperature == 0:
            return False
        if self.heart_rate < 60 or self.heart_rate > 100: return True
        if self.oxygen_saturation < 95: return True
        # Temperature alert thresholds:
        # 36.5 - 37.5: Normal (no alert)
        # 38 - 39: High (alert)
        # 40 - 42: Critical (alert)
        # Beyond 42 or below 36.5: Error (alert)
        if self.body_temperature < 36.5 or self.body_temperature >= 38: return True
        if self.blood_pressure_systolic > 120 or self.blood_pressure_systolic < 90: return True
        if self.blood_pressure_diastolic > 80 or self.blood_pressure_diastolic < 60: return True
        return False

    def save(self, *args, **kwargs):
        self.is_alert = self.check_for_alerts()
        if hasattr(self, 'recorded_at') and self.recorded_at:
            self.recorded_at = self.recorded_at.replace(microsecond=0)
        super().save(*args, **kwargs)

    def __str__(self):
        if hasattr(self, 'patient') and self.patient:
            return f"Vitals for {self.patient.last_name} at {self.recorded_at}"
        return f"Vitals at {self.recorded_at}"

class StudentVital(VitalLogicMixin, models.Model):
    patient = models.ForeignKey(Student, on_delete=models.DO_NOTHING, db_constraint=False, related_name='vitals', to_field='patient_id', db_column='patient_id')
    heart_rate = models.IntegerField(help_text="BPM")
    blood_pressure_systolic = models.IntegerField()
    blood_pressure_diastolic = models.IntegerField()
    oxygen_saturation = models.FloatField(help_text="Percentage")
    body_temperature = models.FloatField(help_text="Celsius")
    recorded_at = models.DateTimeField(default=timezone.now)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_alert = models.BooleanField(default=False)
    is_acknowledged = models.BooleanField(default=False)

    class Meta:
        db_table = '"vitals"."clinic_student_vitals"'
        ordering = ['-recorded_at']

class TeachingStaffVital(VitalLogicMixin, models.Model):
    patient = models.ForeignKey(TeachingStaff, on_delete=models.DO_NOTHING, db_constraint=False, related_name='vitals', to_field='patient_id', db_column='patient_id')
    heart_rate = models.IntegerField(help_text="BPM")
    blood_pressure_systolic = models.IntegerField()
    blood_pressure_diastolic = models.IntegerField()
    oxygen_saturation = models.FloatField(help_text="Percentage")
    body_temperature = models.FloatField(help_text="Celsius")
    recorded_at = models.DateTimeField(default=timezone.now)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_alert = models.BooleanField(default=False)
    is_acknowledged = models.BooleanField(default=False)

    class Meta:
        db_table = '"vitals"."clinic_teaching_staff_vitals"'
        ordering = ['-recorded_at']

class NonTeachingStaffVital(VitalLogicMixin, models.Model):
    patient = models.ForeignKey(NonTeachingStaff, on_delete=models.DO_NOTHING, db_constraint=False, related_name='vitals', to_field='patient_id', db_column='patient_id')
    heart_rate = models.IntegerField(help_text="BPM")
    blood_pressure_systolic = models.IntegerField()
    blood_pressure_diastolic = models.IntegerField()
    oxygen_saturation = models.FloatField(help_text="Percentage")
    body_temperature = models.FloatField(help_text="Celsius")
    recorded_at = models.DateTimeField(default=timezone.now)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_alert = models.BooleanField(default=False)
    is_acknowledged = models.BooleanField(default=False)

    class Meta:
        db_table = '"vitals"."clinic_non_teaching_staff_vitals"'
        ordering = ['-recorded_at']

class PatientArchive(models.Model):
    original_id = models.IntegerField(null=True, blank=True)
    patient_id = models.CharField(max_length=20, unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_initial = models.CharField(max_length=1, blank=True, null=True)
    suffix = models.CharField(max_length=20, blank=True, null=True)
    course = models.CharField(max_length=100, blank=True, null=True)
    year_level = models.CharField(max_length=20, blank=True, null=True)
    birth_date = models.DateField(null=True, blank=True)
    sex = models.CharField(max_length=10, choices=Sex.choices, null=True, blank=True)
    civil_status = models.CharField(max_length=10, choices=CivilStatus.choices, null=True, blank=True)
    clinical_notes = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=20) # STUDENT, TEACHING_STAFF, NON_TEACHING_STAFF
    archived_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"patients"."clinic_patient_archive"'
        ordering = ['-archived_at']

    def __str__(self):
        return f"[ARCHIVED] {self.last_name}, {self.first_name} ({self.patient_id})"

    @property
    def status(self):
        return 'INACTIVE'

# Audit Logs
class LoginLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    login_time = models.DateTimeField(auto_now_add=True)
    logout_time = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    status = models.CharField(max_length=20, default='SUCCESS')

    class Meta:
        ordering = ['-login_time']

    def __str__(self):
        return f"{self.user.username} - {self.status} at {self.login_time}"

class ActionLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    action = models.CharField(max_length=50) # 'Registered', 'Archived', 'Deleted', 'Modified', 'New Vital'
    entity_type = models.CharField(max_length=50) # 'Student', 'Vital', etc.
    entity_id = models.CharField(max_length=50, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username if self.user else 'System'} - {self.action} {self.entity_type} at {self.timestamp}"

