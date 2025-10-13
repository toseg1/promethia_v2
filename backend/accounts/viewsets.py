from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import authenticate
from django.db import transaction
from datetime import datetime, timedelta
from django.utils import timezone
import logging

from .models import (
    User, AthleticProfile, ProfessionalProfile, Achievement,
    Certification, CoachAchievement, CoachAssignment
)
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    UserListSerializer, UserUpdateSerializer, AthleticProfileSerializer,
    ProfessionalProfileSerializer, ProfileCreateSerializer, AchievementSerializer,
    CertificationSerializer, CoachAchievementSerializer, CoachAssignmentSerializer,
    CoachAccessSerializer, CoachAccessRemovalSerializer, CoachAthleteListSerializer
)
from core.permissions import IsOwner, IsOwnerOrCoach, IsCoachOwner, IsAthleteOwner, CanAccessCoachingData
from core.serializers import DashboardSummarySerializer
from core.pagination import StandardResultsSetPagination, SmallResultsSetPagination
from .filters import AthleticProfileFilter, AchievementFilter, CertificationFilter, CoachAchievementFilter


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user management with custom actions for registration, login, and dashboard.
    """
    
    queryset = User.objects.all()
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user_type', 'is_verified', 'created_at']
    search_fields = ['first_name', 'last_name', 'email', 'username']
    ordering_fields = ['created_at', 'first_name', 'last_name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'register':
            return UserRegistrationSerializer
        elif self.action == 'login':
            return UserLoginSerializer
        elif self.action == 'list':
            return UserListSerializer
        elif self.action == 'my_athletes':
            return CoachAthleteListSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action in ['retrieve', 'profile', 'dashboard']:
            return UserProfileSerializer
        return UserProfileSerializer

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['register', 'login', 'request_password_reset', 'confirm_password_reset']:
            return [AllowAny()]
        elif self.action in ['destroy']:
            return []  # No delete permission
        elif self.action in ['my_athletes']:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """Filter queryset based on user type and permissions"""
        user = self.request.user

        if self.action == 'my_athletes':
            # Return athletes assigned to this user (via coach_id)
            # Returns empty queryset if user has no assigned athletes
            return (
                User.objects.get_by_coach(user)
                .select_related('athletic_profile')
                .prefetch_related('athletic_profile__achievements')
            )
        elif self.action == 'list':
            # Coaches can see their assigned athletes + other coaches
            # Athletes can only see their assigned coaches
            if user.is_coach():
                # Coaches see their athletes + other coaches for potential collaboration
                from django.db import models
                assigned_athlete_ids = list(User.objects.get_by_coach(user).values_list('id', flat=True))
                other_coach_ids = list(User.objects.filter(user_type='coach').exclude(id=user.id).values_list('id', flat=True))
                all_ids = assigned_athlete_ids + other_coach_ids
                return User.objects.filter(id__in=all_ids)
            elif user.is_athlete():
                # Athletes can only see coaches assigned to them
                assigned_coach_ids = CoachAssignment.objects.filter(
                    mentee=user,
                    is_active=True
                ).values_list('coach_id', flat=True)
                return User.objects.filter(id__in=assigned_coach_ids)
            else:
                # No other user types should see any users
                return User.objects.none()
        elif self.action == 'retrieve':
            # For individual user retrieval, apply same logic as list
            if user.is_coach():
                assigned_athlete_ids = list(User.objects.get_by_coach(user).values_list('id', flat=True))
                coach_ids = list(User.objects.filter(user_type='coach').values_list('id', flat=True))
                all_ids = assigned_athlete_ids + coach_ids
                return User.objects.filter(id__in=all_ids)
            elif user.is_athlete():
                assigned_coach_ids = list(CoachAssignment.objects.filter(
                    mentee=user,
                    is_active=True
                ).values_list('coach_id', flat=True))
                # Athletes can also see themselves
                all_ids = assigned_coach_ids + [user.id]
                return User.objects.filter(id__in=all_ids)
            else:
                return User.objects.none()
        
        # Default: users can only access their own profile
        return User.objects.filter(id=user.id)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        """
        User registration endpoint.
        POST /api/users/register/
        """
        from django.conf import settings
        from .email_utils import send_welcome_email

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            # Generate tokens
            refresh = RefreshToken.for_user(user)

            # Send welcome email asynchronously (non-blocking)
            login_url = f"{settings.FRONTEND_URL}/"
            send_welcome_email(user, login_url)

            return Response({
                'user': UserProfileSerializer(user, context={'request': request}).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'message': 'Registration successful!'
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """
        User login endpoint.
        POST /api/users/login/
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserProfileSerializer(user, context={'request': request}).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'message': 'Login successful!'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """
        Get current user profile.
        GET /api/users/profile/
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Get dashboard summary data for current user.
        GET /api/users/dashboard/
        """
        user = request.user
        
        # Get upcoming trainings and races
        from core.events import Training, Race
        from accounts.models import Achievement
        
        upcoming_trainings = Training.objects.upcoming_events(user)[:5]
        upcoming_races = Race.objects.upcoming_events(user)[:3]
        
        # Get this week's training stats
        week_start = timezone.now().date() - timedelta(days=timezone.now().weekday())
        week_end = week_start + timedelta(days=6)
        
        this_week_trainings = Training.objects.filter(
            athlete=user,
            date__date__gte=week_start,
            date__date__lte=week_end
        )
        
        this_week_stats = {
            'total_sessions': this_week_trainings.count(),
            'total_duration': sum([t.duration.total_seconds() if t.duration else 0 for t in this_week_trainings]),
            'sports_breakdown': {}
        }
        
        # Get recent achievements
        recent_achievements = []
        if hasattr(user, 'athletic_profile'):
            recent_achievements = user.athletic_profile.recent_achievements
        elif hasattr(user, 'professional_profile'):
            recent_achievements = user.professional_profile.coach_achievements.filter(
                year__gte=datetime.now().year - 1
            )[:5]

        dashboard_data = {
            'upcoming_trainings': upcoming_trainings,
            'upcoming_races': upcoming_races,
            'this_week_stats': this_week_stats,
            'recent_achievements': [
                {
                    'id': a.id,
                    'title': a.title,
                    'category': a.category,
                    'year': a.year
                } for a in recent_achievements[:5]
            ],
            'coaching_summary': user.get_coaching_summary()
        }
        
        serializer = DashboardSummarySerializer(dashboard_data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='my-athletes')
    def my_athletes(self, request):
        """
        Get athletes assigned to current user (if they have any).
        Returns empty list if user has no assigned athletes.
        GET /api/users/my-athletes/

        Security: Access is controlled by coach_id assignments.
        Users can only see athletes explicitly assigned to them via coach_id.
        """
        athletes = self.get_queryset()
        serializer = self.get_serializer(athletes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='add-coach-access')
    def add_coach_access(self, request):
        """
        Add coach access via coach_id.
        POST /api/users/add-coach-access/
        """
        serializer = CoachAccessSerializer(data=request.data)
        if serializer.is_valid():
            coach_id = serializer.validated_data['coach_id']
            notes = serializer.validated_data.get('notes', '')
            
            result = request.user.add_coach_access(coach_id, notes)

            assignment = result.get('assignment')
            if isinstance(assignment, CoachAssignment):
                result['assignment'] = CoachAssignmentSerializer(assignment).data

            coach = result.get('coach')
            if isinstance(coach, User):
                result['coach'] = {
                    'id': coach.id,
                    'coach_id': coach.coach_id,
                    'first_name': coach.first_name,
                    'last_name': coach.last_name,
                    'email': coach.email,
                }
            
            if result['success']:
                status_code = status.HTTP_200_OK if result.get('already_connected') else status.HTTP_201_CREATED
                return Response(result, status=status_code)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='remove-coach-access')
    def remove_coach_access(self, request):
        """
        Remove coach access for an assigned athlete (hard delete).
        POST /api/users/remove-coach-access/
        """
        import logging
        logger = logging.getLogger(__name__)

        serializer = CoachAccessRemovalSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        athlete_id = serializer.validated_data.get('athlete_id')
        coach_id = serializer.validated_data.get('coach_id')

        # Coaches removing an athlete from their roster
        if request.user.is_coach():
            if not athlete_id:
                return Response(
                    {'success': False, 'message': 'Athlete identifier is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                athlete = User.objects.get(pk=athlete_id)
            except User.DoesNotExist:
                return Response(
                    {'success': False, 'message': 'Athlete not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            logger.info(f'Coach {request.user.id} removing athlete {athlete.id}')
            removed_count = athlete.remove_coach(request.user)
            logger.info(f'Removed {removed_count} coach assignment(s)')

            if removed_count > 0:
                return Response(
                    {
                        'success': True,
                        'message': f'Coach access removed for {athlete.get_full_name() or athlete.username}.',
                        'removed_assignments': removed_count,
                    },
                    status=status.HTTP_200_OK
                )

            return Response(
                {
                    'success': False,
                    'message': 'No active coaching relationship found to remove.',
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Athletes revoking a coach's access
        if request.user.is_athlete():
            if not coach_id:
                return Response(
                    {'success': False, 'message': 'Coach identifier is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                coach = User.objects.get(pk=coach_id)
            except User.DoesNotExist:
                return Response(
                    {'success': False, 'message': 'Coach not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            logger.info(f'Athlete {request.user.id} removing coach {coach.id}')
            removed_count = request.user.remove_coach(coach)
            logger.info(f'Removed {removed_count} coach assignment(s)')

            if removed_count > 0:
                coach_name = coach.get_full_name() or coach.username
                return Response(
                    {
                        'success': True,
                        'message': f'{coach_name} no longer has access to your training data.',
                        'removed_assignments': removed_count,
                    },
                    status=status.HTTP_200_OK
                )

            return Response(
                {
                    'success': False,
                    'message': 'No active coaching relationship found to remove.',
                },
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {'success': False, 'message': 'Permission denied.'},
            status=status.HTTP_403_FORBIDDEN
        )

    def destroy(self, request, *args, **kwargs):
        """Disable user deletion"""
        return Response(
            {'error': 'User deletion is not allowed.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def upload_profile_image(self, request, pk=None):
        """Upload profile image for user"""
        user = self.get_object()
        
        # Check if user can edit this profile
        if request.user != user and not (
            request.user.is_coach() and 
            CoachAssignment.objects.filter(
                coach=request.user, 
                mentee=user, 
                is_active=True
            ).exists()
        ):
            return Response(
                {'success': False, 'message': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if 'profile_image' not in request.FILES:
            return Response(
                {'success': False, 'message': 'No image file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        profile_image = request.FILES['profile_image']
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
        if profile_image.content_type not in allowed_types:
            return Response(
                {'success': False, 'message': 'Invalid file type. Only JPEG, PNG, and GIF are allowed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (5MB limit)
        if profile_image.size > 5 * 1024 * 1024:
            return Response(
                {'success': False, 'message': 'File too large. Maximum size is 5MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save the image
        user.profile_image = profile_image
        user.save()
        
        profile_image_url = None
        if user.profile_image:
            profile_image_url = user.profile_image.url
            if request and profile_image_url and not profile_image_url.startswith(('http://', 'https://')):
                profile_image_url = request.build_absolute_uri(profile_image_url)

        return Response({
            'success': True,
            'message': 'Profile image updated successfully',
            'data': {
                'profile_image_url': profile_image_url
            }
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def remove_profile_image(self, request, pk=None):
        """Remove profile image for user"""
        user = self.get_object()
        
        # Check if user can edit this profile
        if request.user != user and not (
            request.user.is_coach() and 
            CoachAssignment.objects.filter(
                coach=request.user, 
                mentee=user, 
                is_active=True
            ).exists()
        ):
            return Response(
                {'success': False, 'message': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.profile_image:
            user.profile_image.delete()
            user.profile_image = None
            user.save()
            
            return Response({
                'success': True,
                'message': 'Profile image removed successfully'
            }, status=status.HTTP_200_OK)
        
        return Response(
            {'success': False, 'message': 'No profile image to remove'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], authentication_classes=[])
    def test_email(self, request):
        """
        Test email configuration endpoint (for debugging only)
        GET /api/users/test_email/
        """
        from django.conf import settings
        from django.core.mail import send_mail
        import logging

        logger = logging.getLogger(__name__)

        # Only allow in DEBUG mode or specific test parameter
        if not settings.DEBUG and request.GET.get('secret') != 'test123':
            return Response({'error': 'Not allowed'}, status=status.HTTP_403_FORBIDDEN)

        test_email = request.GET.get('email', settings.EMAIL_HOST_USER)

        try:
            # Test synchronous email (not threaded)
            send_mail(
                subject='[TEST] Promethia Email Test',
                message='This is a test email. If you received this, email is working!',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[test_email],
                fail_silently=False,
            )

            logger.info(f"Test email sent successfully to {test_email}")

            return Response({
                'success': True,
                'message': f'Test email sent to {test_email}',
                'config': {
                    'EMAIL_BACKEND': settings.EMAIL_BACKEND,
                    'EMAIL_HOST': settings.EMAIL_HOST,
                    'EMAIL_PORT': settings.EMAIL_PORT,
                    'EMAIL_USE_TLS': settings.EMAIL_USE_TLS,
                    'DEFAULT_FROM_EMAIL': settings.DEFAULT_FROM_EMAIL,
                }
            })

        except Exception as e:
            logger.error(f"Test email failed: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e),
                'type': type(e).__name__
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def request_password_reset(self, request):
        """Request password reset token"""
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        from django.conf import settings
        import logging

        logger = logging.getLogger(__name__)
        email = request.data.get('email')

        if not email:
            return Response(
                {'success': False, 'message': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)

            # Generate password reset token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))

            # Create reset link
            reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

            # Send password reset email asynchronously (non-blocking)
            if settings.DEBUG:
                logger.info("Password reset link generated for %s: %s", email, reset_link)

            from .email_utils import send_password_reset_email
            send_password_reset_email(user, reset_link)

            # Always return success (security best practice - don't reveal if user exists)
            return Response({
                'success': True,
                'message': f'If an account exists for {email}, a password reset email has been sent.',
                'data': {
                    'reset_link': reset_link if settings.DEBUG else None  # Only in development
                }
            })

        except User.DoesNotExist:
            # Don't reveal whether email exists or not (security best practice)
            logger.info(f"Password reset requested for non-existent email: {email}")
            return Response({
                'success': True,
                'message': f'If an account exists for {email}, a password reset email has been sent.'
            })
        except Exception as e:
            # Catch any unexpected errors and log them
            logger.error(f"Unexpected error in password reset: {str(e)}", exc_info=True)
            # Still return success to not reveal system errors to potential attackers
            return Response({
                'success': True,
                'message': f'If an account exists for {email}, a password reset email has been sent.'
            })
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def confirm_password_reset(self, request):
        """Confirm password reset with token"""
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_str
        from django.utils.http import urlsafe_base64_decode
        
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not all([uid, token, new_password]):
            return Response(
                {'success': False, 'message': 'UID, token, and new password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Decode user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
            # Verify token
            if default_token_generator.check_token(user, token):
                # Validate password strength
                if len(new_password) < 8:
                    return Response(
                        {'success': False, 'message': 'Password must be at least 8 characters long'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Set new password
                user.set_password(new_password)
                user.save()
                
                return Response({
                    'success': True,
                    'message': 'Password reset successfully'
                })
            else:
                return Response(
                    {'success': False, 'message': 'Invalid or expired reset token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {'success': False, 'message': 'Invalid reset link'},
                status=status.HTTP_400_BAD_REQUEST
            )


class AthleticProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for athletic profiles.
    Athletes can manage their own profiles.
    """
    
    queryset = AthleticProfile.objects.all()
    serializer_class = AthleticProfileSerializer
    permission_classes = [IsAthleteOwner]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = AthleticProfileFilter
    ordering_fields = ['created_at', 'experience_years']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter to user's own profile or accessible profiles"""
        if not self.request.user.is_authenticated:
            return AthleticProfile.objects.none()
            
        if self.request.user.is_athlete():
            return AthleticProfile.objects.filter(user=self.request.user)
        elif self.request.user.is_coach():
            # Coaches can view profiles of their assigned athletes
            assigned_athletes = User.objects.get_by_coach(self.request.user)
            return AthleticProfile.objects.filter(user__in=assigned_athletes)
        return AthleticProfile.objects.none()

    def perform_create(self, serializer):
        """Ensure profile is created for current user"""
        if self.request.user.is_athlete():
            serializer.save(user=self.request.user)
        else:
            raise PermissionError("Only athletes can create athletic profiles.")


class ProfessionalProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for professional profiles.
    Coaches can manage their own profiles.
    Athletes can view their assigned coaches' profiles (read-only).
    """
    
    queryset = ProfessionalProfile.objects.all()
    serializer_class = ProfessionalProfileSerializer
    permission_classes = [IsOwnerOrCoach]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['experience_years']
    ordering_fields = ['created_at', 'experience_years']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Filter professional profiles based on user type:
        - Coaches see their own profile
        - Athletes see profiles of their assigned coaches
        """
        if not self.request.user.is_authenticated:
            return ProfessionalProfile.objects.none()
            
        if self.request.user.is_coach():
            # Coaches see their own profile
            return ProfessionalProfile.objects.filter(user=self.request.user)
        elif self.request.user.is_athlete():
            # Athletes see profiles of their assigned coaches
            assigned_coaches = User.objects.filter(
                id__in=CoachAssignment.objects.filter(
                    mentee=self.request.user,
                    is_active=True
                ).values_list('coach_id', flat=True)
            )
            return ProfessionalProfile.objects.filter(user__in=assigned_coaches)
        
        return ProfessionalProfile.objects.none()

    def get_permissions(self):
        """
        Set permissions based on action:
        - Athletes can only read (GET)
        - Coaches can perform all operations on their own profiles
        """
        if self.action in ['list', 'retrieve']:
            # Allow both coaches and athletes to view
            return [IsOwnerOrCoach()]
        else:
            # Only coaches can create/update/delete their own profiles
            return [IsCoachOwner()]

    def perform_create(self, serializer):
        """Ensure profile is created for current user"""
        if self.request.user.is_coach():
            serializer.save(user=self.request.user)
        else:
            raise PermissionError("Only coaches can create professional profiles.")


class AchievementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for athlete achievements.
    """
    
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer
    permission_classes = [IsOwner]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = AchievementFilter
    search_fields = ['title', 'description']
    ordering_fields = ['year', 'created_at', 'title']
    ordering = ['-year', '-created_at']

    def get_queryset(self):
        """Filter achievements based on user access"""
        if not self.request.user.is_authenticated:
            return Achievement.objects.none()
            
        if self.request.user.is_athlete():
            # Athletes see their own achievements
            try:
                profile = self.request.user.athletic_profile
                return Achievement.objects.filter(profile=profile)
            except AthleticProfile.DoesNotExist:
                return Achievement.objects.none()
        elif self.request.user.is_coach():
            # Coaches see achievements of their assigned athletes
            assigned_athletes = User.objects.get_by_coach(self.request.user)
            profiles = AthleticProfile.objects.filter(user__in=assigned_athletes)
            return Achievement.objects.filter(profile__in=profiles)
        
        return Achievement.objects.none()

    def perform_create(self, serializer):
        """Ensure achievement is created for user's profile"""
        if self.request.user.is_athlete():
            try:
                profile = self.request.user.athletic_profile
                serializer.save(profile=profile)
            except AthleticProfile.DoesNotExist:
                raise PermissionError("Athletic profile must be created first.")
        else:
            raise PermissionError("Only athletes can create achievements.")


class CertificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for professional certifications.
    Users can manage their own certifications on their professional profile.
    Athletes can also view their assigned coaches' certifications (read-only).
    """
    
    queryset = Certification.objects.all()
    serializer_class = CertificationSerializer
    permission_classes = [IsOwnerOrCoach]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CertificationFilter
    search_fields = ['title', 'issuing_organization']
    ordering_fields = ['year', 'created_at', 'title']
    ordering = ['-year', '-created_at']

    def get_queryset(self):
        """
        Filter certifications based on user access:
        - All users can see their own professional certifications
        - Athletes can also see certifications of their assigned coaches
        """
        if not self.request.user.is_authenticated:
            return Certification.objects.none()
        
        from django.db.models import Q
        
        # Start with user's own certifications filter
        user_filter = Q()
        try:
            profile = self.request.user.professional_profile
            user_filter = Q(profile=profile)
        except ProfessionalProfile.DoesNotExist:
            # If user has no professional profile, they have no certifications
            user_filter = Q(pk__in=[])
        
        # For athletes, also include certifications from assigned coaches
        if self.request.user.is_athlete():
            assigned_coaches = User.objects.filter(
                id__in=CoachAssignment.objects.filter(
                    mentee=self.request.user,
                    is_active=True
                ).values_list('coach_id', flat=True)
            )
            coach_profiles = ProfessionalProfile.objects.filter(user__in=assigned_coaches)
            coach_filter = Q(profile__in=coach_profiles)
            
            # Combine user's own certifications with coach certifications using OR
            return Certification.objects.filter(user_filter | coach_filter)
        
        # For all other users (including coaches), return only their own certifications
        return Certification.objects.filter(user_filter)

    def get_permissions(self):
        """
        Set permissions based on action:
        - All users can read certifications (their own and their coaches')
        - All users can perform CRUD operations on their own certifications
        """
        if self.action in ['list', 'retrieve']:
            return [IsOwnerOrCoach()]
        else:
            return [IsOwner()]

    def perform_create(self, serializer):
        """Ensure certification is created for user's professional profile"""
        try:
            # Get or create professional profile for the user
            profile, created = ProfessionalProfile.objects.get_or_create(
                user=self.request.user,
                defaults={'experience_years': 0}
            )
            serializer.save(profile=profile)
        except Exception as e:
            raise PermissionError(f"Could not create certification: {str(e)}")

    def perform_destroy(self, instance):
        """Ensure certification deletion is properly scoped to user's professional profile"""
        try:
            # Verify the certification belongs to the user's professional profile
            profile = self.request.user.professional_profile
            if instance.profile != profile:
                raise PermissionError("Cannot delete certification from another user's profile")
            instance.delete()
        except ProfessionalProfile.DoesNotExist:
            raise PermissionError("User does not have a professional profile")
        except Exception as e:
            raise PermissionError(f"Could not delete certification: {str(e)}")


class CoachAchievementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for professional achievements.
    Users can manage their own achievements on their professional profile.
    Athletes can also view their assigned coaches' achievements (read-only).
    """
    
    queryset = CoachAchievement.objects.all()
    serializer_class = CoachAchievementSerializer
    permission_classes = [IsOwnerOrCoach]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CoachAchievementFilter
    search_fields = ['title', 'description']
    ordering_fields = ['year', 'created_at', 'title']
    ordering = ['-year', '-created_at']

    def get_queryset(self):
        """
        Filter coach achievements based on user access:
        - All users can see their own professional achievements
        - Athletes can also see achievements of their assigned coaches
        """
        if not self.request.user.is_authenticated:
            return CoachAchievement.objects.none()
        
        from django.db.models import Q
        
        # Start with user's own achievements filter
        user_filter = Q()
        try:
            profile = self.request.user.professional_profile
            user_filter = Q(profile=profile)
        except ProfessionalProfile.DoesNotExist:
            # If user has no professional profile, they have no achievements
            user_filter = Q(pk__in=[])
        
        # For athletes, also include achievements from assigned coaches
        if self.request.user.is_athlete():
            assigned_coaches = User.objects.filter(
                id__in=CoachAssignment.objects.filter(
                    mentee=self.request.user,
                    is_active=True
                ).values_list('coach_id', flat=True)
            )
            coach_profiles = ProfessionalProfile.objects.filter(user__in=assigned_coaches)
            coach_filter = Q(profile__in=coach_profiles)
            
            # Combine user's own achievements with coach achievements using OR
            return CoachAchievement.objects.filter(user_filter | coach_filter)
        
        # For all other users (including coaches), return only their own achievements
        return CoachAchievement.objects.filter(user_filter)

    def get_permissions(self):
        """
        Set permissions based on action:
        - All users can read achievements (their own and their coaches')
        - All users can perform CRUD operations on their own achievements
        """
        if self.action in ['list', 'retrieve']:
            return [IsOwnerOrCoach()]
        else:
            return [IsOwner()]

    def perform_create(self, serializer):
        """Ensure achievement is created for user's professional profile"""
        try:
            # Get or create professional profile for the user
            profile, created = ProfessionalProfile.objects.get_or_create(
                user=self.request.user,
                defaults={'experience_years': 0}
            )
            serializer.save(profile=profile)
        except Exception as e:
            raise PermissionError(f"Could not create achievement: {str(e)}")

    def perform_destroy(self, instance):
        """Ensure achievement deletion is properly scoped to user's professional profile"""
        try:
            # Verify the achievement belongs to the user's professional profile
            profile = self.request.user.professional_profile
            if instance.profile != profile:
                raise PermissionError("Cannot delete achievement from another user's profile")
            instance.delete()
        except ProfessionalProfile.DoesNotExist:
            raise PermissionError("User does not have a professional profile")
        except Exception as e:
            raise PermissionError(f"Could not delete achievement: {str(e)}")


class CoachAssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for coach-athlete assignments (read-only).
    Both coaches and athletes can view their relationships.
    """
    
    queryset = CoachAssignment.objects.all()
    serializer_class = CoachAssignmentSerializer
    permission_classes = [CanAccessCoachingData]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['is_active', 'start_date']
    ordering_fields = ['start_date', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter assignments based on user role"""
        user = self.request.user
        
        # Return assignments where user is either coach or mentee
        from django.db import models
        return CoachAssignment.objects.filter(
            models.Q(coach=user) | models.Q(mentee=user)
        ).select_related('coach', 'mentee')
logger = logging.getLogger(__name__)
