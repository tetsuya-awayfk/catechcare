from rest_framework import serializers
from django.core.exceptions import ObjectDoesNotExist
from .models import User, Student, TeachingStaff, NonTeachingStaff, StudentVital, TeachingStaffVital, NonTeachingStaffVital, PatientArchive
from django.contrib.auth import authenticate
from datetime import timedelta
from django.utils import timezone

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'name', 'role')
        extra_kwargs = {'password': {'write_only': True}}

    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

class PatientSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    patient_id = serializers.CharField(max_length=20)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    middle_initial = serializers.CharField(max_length=1, allow_blank=True, required=False, allow_null=True)
    suffix = serializers.CharField(max_length=20, allow_blank=True, required=False, allow_null=True)
    birth_date = serializers.DateField(required=False, allow_null=True)
    sex = serializers.CharField(max_length=10, required=False, allow_null=True)
    course = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    year_level = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    civil_status = serializers.CharField(max_length=10, required=False, allow_null=True, allow_blank=True)
    clinical_notes = serializers.CharField(allow_blank=True, required=False, allow_null=True)
    status = serializers.CharField(max_length=10, required=False)
    created_at = serializers.DateTimeField(read_only=True)
    category = serializers.SerializerMethodField()
    latest_vitals = serializers.SerializerMethodField()
    name_formatted = serializers.SerializerMethodField()

    def get_category(self, obj):
        return getattr(obj, 'category', 'STUDENT')

    def get_latest_vitals(self, obj):
        if not hasattr(obj, 'vitals'):
            return None
        latest = obj.vitals.first()
        if latest:
            return VitalSignRecordSerializer(latest).data
        return None

    def get_name_formatted(self, obj):
        mi = f" {obj.middle_initial}." if obj.middle_initial else ""
        suf = f", {obj.suffix}" if obj.suffix and obj.suffix != "-" else ""
        return f"{obj.last_name}, {obj.first_name}{mi}{suf}".strip()

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class VitalSignRecordSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    heart_rate = serializers.IntegerField()
    blood_pressure_systolic = serializers.IntegerField()
    blood_pressure_diastolic = serializers.IntegerField()
    oxygen_saturation = serializers.FloatField()
    body_temperature = serializers.FloatField()
    recorded_at = serializers.DateTimeField(read_only=True, format="%Y-%m-%d %H:%M:%S")
    recorded_by_name = serializers.ReadOnlyField(source='recorded_by.username')
    patient_name = serializers.SerializerMethodField()
    patient = serializers.CharField(source='patient_id', read_only=True)
    patient_category = serializers.SerializerMethodField()
    is_alert = serializers.BooleanField(read_only=True)
    is_acknowledged = serializers.BooleanField(read_only=True)
    patient_id_string = serializers.SerializerMethodField()
    course = serializers.SerializerMethodField()
    year_level = serializers.SerializerMethodField()

    def get_patient_id_string(self, obj):
        try:
            return obj.patient.patient_id if obj.patient else ""
        except ObjectDoesNotExist:
            return ""

    def get_course(self, obj):
        try:
            p = obj.patient
            return getattr(p, 'course', "") if p else ""
        except ObjectDoesNotExist:
            return ""

    def get_year_level(self, obj):
        try:
            p = obj.patient
            return getattr(p, 'year_level', "") if p else ""
        except ObjectDoesNotExist:
            return ""

    def get_patient_name(self, obj):
        try:
            p = obj.patient
            if not p: return "Unknown"
            mi = f"{p.middle_initial}. " if p.middle_initial else ""
            suf = f" {p.suffix}" if getattr(p, 'suffix', None) and p.suffix != "-" else ""
            return f"{getattr(p, 'first_name', '')} {mi}{getattr(p, 'last_name', '')}{suf}".strip()
        except ObjectDoesNotExist:
            return "Archived Patient"

    def get_patient_category(self, obj):
        try:
            p = obj.patient
            if not p: return "STUDENT"
            return getattr(p, 'category', 'STUDENT')
        except ObjectDoesNotExist:
            return "ARCHIVED"

class DashboardSummarySerializer(serializers.Serializer):
    today_vitals_count = serializers.IntegerField()
    alert_count = serializers.IntegerField()
    avg_heart_rate = serializers.FloatField()
    avg_temp = serializers.FloatField()
    category_breakdown = serializers.DictField()
