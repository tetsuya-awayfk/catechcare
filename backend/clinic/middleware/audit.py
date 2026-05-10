import logging

logger = logging.getLogger('audit')

class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith('/api/patients/') or request.path.startswith('/api/vitals/'):
            user = request.user.username if hasattr(request, 'user') and request.user.is_authenticated else 'Anonymous'
            ip = request.META.get('REMOTE_ADDR')
            
            # Use X-Forwarded-For if behind a proxy like Nginx/Cloudflare
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
                
            logger.info(f"Audit: User {user} from IP {ip} accessed {request.path} | Method: {request.method} | Status: {response.status_code}")
        return response
