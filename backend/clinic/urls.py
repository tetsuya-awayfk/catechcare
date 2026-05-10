from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, VitalSignViewSet, DashboardSummaryView, AlarmHistoryView, ClinicStatsView, VerifyPasswordView, UpdateProfileView

router = DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'vitals', VitalSignViewSet, basename='vitals')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('alarms/', AlarmHistoryView.as_view(), name='alarm-history'),
    path('stats/', ClinicStatsView.as_view(), name='clinic-stats'),
    path('verify-password/', VerifyPasswordView.as_view(), name='verify-password'),
    path('profile/update/', UpdateProfileView.as_view(), name='update-profile'),
]
