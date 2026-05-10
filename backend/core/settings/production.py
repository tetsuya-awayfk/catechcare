from .base import *
import os
import dj_database_url

DEBUG = False
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
ALLOWED_HOSTS = ['api.catechcare.com', 'catechcare-backend.onrender.com', 'localhost', '127.0.0.1', 'catechcare.onrender.com']

# HTTPS Settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000 # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CORS Settings
CORS_ALLOWED_ORIGINS = [
    "https://catechcare.vercel.app",
    "https://www.catechcare.com",
]

# Database (Using Neon / PostgreSQL)
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        ssl_require=True
    )
}

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Storage (Cloudflare R2 via django-storages)
if os.environ.get("AWS_S3_ENDPOINT_URL"):
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "endpoint_url": os.environ.get("AWS_S3_ENDPOINT_URL"),
                "access_key": os.environ.get("AWS_ACCESS_KEY_ID"),
                "secret_key": os.environ.get("AWS_SECRET_ACCESS_KEY"),
                "bucket_name": os.environ.get("AWS_STORAGE_BUCKET_NAME"),
                "region_name": "auto",
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
else:
    # Use Whitenoise for static files if no external storage is defined
    STORAGES = {
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

# Redis / Channels
if os.environ.get('REDIS_URL'):
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [os.environ.get('REDIS_URL')],
            },
        },
    }

# REST Framework Throttling & Auth
REST_FRAMEWORK.update({
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day'
    }
})

# Add Middleware
MIDDLEWARE.append('clinic.middleware.audit.AuditLogMiddleware')
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
