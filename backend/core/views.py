from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.utils import timezone
from clinic.serializers import UserSerializer
from clinic.models import LoginLog
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Validate role matches the user's role
        role = self.initial_data.get('role')
        if role and self.user.role != role:
            raise AuthenticationFailed('Wrong credentials, or selected role Please try again.')

        # Rate limiting: Check if there is an active session for the role
        active_login = LoginLog.objects.filter(user__role=self.user.role, logout_time__isnull=True).exists()
        if active_login:
            raise AuthenticationFailed(f'A user with the {self.user.role} role is already logged in.')

        # Create new LoginLog
        LoginLog.objects.create(
            user=self.user,
            ip_address=self.context['request'].META.get('REMOTE_ADDR'),
            status='SUCCESS'
        )

        # Inject the user object into the response securely
        data['user'] = UserSerializer(self.user).data
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        last_login = LoginLog.objects.filter(user=user, logout_time__isnull=True).order_by('-login_time').first()
        if last_login:
            last_login.logout_time = timezone.now()
            last_login.save()
        return Response({'success': True}, status=status.HTTP_200_OK)
