from .settings import *

# Use SQLite for development if PostgreSQL is not available
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Development-specific settings for admin interface
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '*']

# Ensure CSRF settings work for admin
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
]

# Make sure session and CSRF cookies work locally
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# For development, allow all origins for CORS
CORS_ALLOW_ALL_ORIGINS = True

print("Using SQLite database for development")