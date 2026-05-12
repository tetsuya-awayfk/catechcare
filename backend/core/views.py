from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.utils import timezone
from clinic.serializers import UserSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Validate role matches the user's role
        role = self.initial_data.get('role')
        if role and self.user.role != role:
            raise AuthenticationFailed('Wrong credentials, or selected role. Please try again.')

        # LoginLog tracking (non-blocking — login must always work)
        try:
            from clinic.models import LoginLog
            # Force logout any previous sessions for this role
            LoginLog.objects.filter(user__role=self.user.role, logout_time__isnull=True).update(logout_time=timezone.now())
            # Create new LoginLog
            LoginLog.objects.create(
                user=self.user,
                ip_address=self.context['request'].META.get('REMOTE_ADDR'),
                status='SUCCESS'
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f'LoginLog tracking failed (non-critical): {e}')

        # Inject the user object into the response securely
        data['user'] = UserSerializer(self.user).data
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            from clinic.models import LoginLog
            user = request.user
            last_login = LoginLog.objects.filter(user=user, logout_time__isnull=True).order_by('-login_time').first()
            if last_login:
                last_login.logout_time = timezone.now()
                last_login.save()
        except Exception:
            pass
        return Response({'success': True}, status=status.HTTP_200_OK)
