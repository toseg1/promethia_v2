from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .viewsets import (
    UserViewSet, AthleticProfileViewSet, ProfessionalProfileViewSet,
    AchievementViewSet, CertificationViewSet, CoachAchievementViewSet,
    CoachAssignmentViewSet
)

app_name = 'accounts'

# Create router and register viewsets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'athletic-profiles', AthleticProfileViewSet, basename='athleticprofile')
router.register(r'professional-profiles', ProfessionalProfileViewSet, basename='professionalprofile')
router.register(r'achievements', AchievementViewSet, basename='achievement')
router.register(r'certifications', CertificationViewSet, basename='certification')
router.register(r'coach-achievements', CoachAchievementViewSet, basename='coachachievement')
router.register(r'coach-assignments', CoachAssignmentViewSet, basename='coachassignment')

urlpatterns = [
    # Include DRF router URLs (this provides all the API endpoints)
    path('', include(router.urls)),
    
    # Legacy view-based URLs (if still needed)
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.user_profile_view, name='profile'),
    path('profile/update/', views.update_profile_view, name='update_profile'),
    path('password/change/', views.change_password_view, name='change_password'),
    path('token/refresh/', views.refresh_token_view, name='refresh_token'),
]

# API endpoints provided by the router:
# 
# User Management:
# POST /api/users/register/ - User registration
# POST /api/users/login/ - User login
# GET /api/users/profile/ - Current user profile
# GET /api/users/dashboard/ - Dashboard summary
# GET /api/users/my-athletes/ - Coach's athletes
# POST /api/users/add-coach-access/ - Add coach access
# POST /api/users/request-password-reset/ - Request password reset
# POST /api/users/confirm-password-reset/ - Confirm password reset
# GET /api/users/ - List users (filtered)
# GET /api/users/{id}/ - User detail
# PATCH /api/users/{id}/ - Update user
# POST /api/users/{id}/upload-profile-image/ - Upload profile image
# DELETE /api/users/{id}/remove-profile-image/ - Remove profile image
#
# Athletic Profiles:
# GET /api/athletic-profiles/ - List profiles
# POST /api/athletic-profiles/ - Create profile
# GET /api/athletic-profiles/{id}/ - Profile detail
# PATCH /api/athletic-profiles/{id}/ - Update profile
#
# Professional Profiles:
# GET /api/professional-profiles/ - List profiles
# POST /api/professional-profiles/ - Create profile
# GET /api/professional-profiles/{id}/ - Profile detail
# PATCH /api/professional-profiles/{id}/ - Update profile
#
# Achievements (Athletes):
# GET /api/achievements/ - List achievements
# POST /api/achievements/ - Create achievement
# GET /api/achievements/{id}/ - Achievement detail
# PATCH /api/achievements/{id}/ - Update achievement
# DELETE /api/achievements/{id}/ - Delete achievement
#
# Certifications (Coaches):
# GET /api/certifications/ - List certifications
# POST /api/certifications/ - Create certification
# GET /api/certifications/{id}/ - Certification detail
# PATCH /api/certifications/{id}/ - Update certification
# DELETE /api/certifications/{id}/ - Delete certification
#
# Coach Achievements:
# GET /api/coach-achievements/ - List achievements
# POST /api/coach-achievements/ - Create achievement
# GET /api/coach-achievements/{id}/ - Achievement detail
# PATCH /api/coach-achievements/{id}/ - Update achievement
# DELETE /api/coach-achievements/{id}/ - Delete achievement
#
# Coach Assignments (Read-only):
# GET /api/coach-assignments/ - List assignments
# GET /api/coach-assignments/{id}/ - Assignment detail