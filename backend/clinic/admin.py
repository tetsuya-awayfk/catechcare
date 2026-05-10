from django.contrib import admin
from .models import User, Student, TeachingStaff, NonTeachingStaff, StudentVital, TeachingStaffVital, NonTeachingStaffVital

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff')
    search_fields = ('username', 'email')
    list_filter = ('role', 'is_staff', 'is_superuser')

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('patient_id', 'first_name', 'last_name', 'course', 'year_level', 'status')
    search_fields = ('patient_id', 'first_name', 'last_name')
    list_filter = ('status', 'sex')

@admin.register(TeachingStaff)
class TeachingStaffAdmin(admin.ModelAdmin):
    list_display = ('patient_id', 'first_name', 'last_name', 'status')
    search_fields = ('patient_id', 'first_name', 'last_name')
    list_filter = ('status', 'sex')

@admin.register(NonTeachingStaff)
class NonTeachingStaffAdmin(admin.ModelAdmin):
    list_display = ('patient_id', 'first_name', 'last_name', 'status')
    search_fields = ('patient_id', 'first_name', 'last_name')
    list_filter = ('status', 'sex')

class BaseVitalAdmin(admin.ModelAdmin):
    list_display = ('patient', 'recorded_at', 'is_alert')
    list_filter = ('is_alert', 'is_acknowledged', 'recorded_at')
    date_hierarchy = 'recorded_at'

@admin.register(StudentVital)
class StudentVitalAdmin(BaseVitalAdmin):
    pass

@admin.register(TeachingStaffVital)
class TeachingStaffVitalAdmin(BaseVitalAdmin):
    pass

@admin.register(NonTeachingStaffVital)
class NonTeachingStaffVitalAdmin(BaseVitalAdmin):
    pass
