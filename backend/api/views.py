from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings
from core.utils import APIResponse


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint to verify API is running.
    """
    return Response(
        APIResponse.success(
            data={
                'status': 'healthy',
                'version': '1.0.0',
                'debug': settings.DEBUG,
            },
            message="API is running successfully"
        )
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def api_info(request):
    """
    API information endpoint with complete endpoint listing.
    """
    endpoints = {
        # User Management
        'user_register': '/api/v1/users/register/',
        'user_login': '/api/v1/users/login/',
        'user_profile': '/api/v1/users/profile/',
        'user_dashboard': '/api/v1/users/dashboard/',
        'my_athletes': '/api/v1/users/my-athletes/',
        'add_coach_access': '/api/v1/users/add-coach-access/',
        'users': '/api/v1/users/',
        
        # Profiles
        'athletic_profiles': '/api/v1/athletic-profiles/',
        'professional_profiles': '/api/v1/professional-profiles/',
        
        # Achievements & Certifications
        'achievements': '/api/v1/achievements/',
        'certifications': '/api/v1/certifications/',
        'coach_achievements': '/api/v1/coach-achievements/',
        'coach_assignments': '/api/v1/coach-assignments/',
        
        # Training Management
        'training': '/api/v1/training/',
        'training_calendar': '/api/v1/training/calendar/',
        'training_upcoming': '/api/v1/training/upcoming/',
        'training_this_week': '/api/v1/training/this-week/',
        'training_stats': '/api/v1/training/stats/',
        
        # Race Management
        'races': '/api/v1/races/',
        'races_upcoming': '/api/v1/races/upcoming/',
        'races_results': '/api/v1/races/results/',
        'races_by_sport': '/api/v1/races/by-sport/',
        
        # Custom Events
        'custom_events': '/api/v1/custom-events/',
        
        # Combined Events
        'events_calendar': '/api/v1/events/calendar/',
        'events_this_week': '/api/v1/events/this-week/',
        
        # System
        'health': '/api/health/',
        'info': '/api/info/',
    }
    
    return Response(
        APIResponse.success(
            data={
                'name': 'Sports Training API',
                'version': 'v1.0.0',
                'description': 'Comprehensive Django REST API for sports training application',
                'base_url': request.build_absolute_uri('/api/v1/'),
                'total_endpoints': len(endpoints),
                'endpoints': endpoints,
                'authentication': 'JWT Token',
                'documentation': 'See API_DOCUMENTATION.md for complete details',
                'features': [
                    'User management (athletes & coaches)',
                    'Training session management with complex data',
                    'Race tracking and performance analysis',
                    'Achievement and certification management',
                    'Coach-athlete relationship management',
                    'Calendar and dashboard views',
                    'Advanced filtering and search',
                    'Comprehensive permissions system'
                ]
            },
            message="Sports Training API information retrieved successfully"
        )
    )
