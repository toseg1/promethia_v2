from django.urls import path, include
from . import views

app_name = 'api'

# API v1 URLs
v1_patterns = [
    path('', include('accounts.urls')),  # User management, profiles, achievements
    path('', include('core.urls')),      # Training, races, events
]

urlpatterns = [
    # Root API info (redirects to /api/info/)
    path('', views.api_info, name='api_root'),
    
    # Health check and info endpoints
    path('health/', views.health_check, name='health_check'),
    path('info/', views.api_info, name='api_info'),
    
    # Versioned API endpoints
    path('v1/', include((v1_patterns, 'api'), namespace='v1')),
]