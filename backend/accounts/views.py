import logging

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.conf import settings
from core.utils import APIResponse
from .models import User
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
    PasswordChangeSerializer,
    PasswordResetSerializer,
    PasswordResetConfirmSerializer
)


class UserRegistrationView(generics.CreateAPIView):
    """
    User registration endpoint.
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Send welcome email
        try:
            login_url = f"{settings.FRONTEND_URL}"
            context = {
                'user': user,
                'login_url': login_url,
                'site_name': 'Promethia',
            }

            html_message = render_to_string('emails/welcome.html', context)
            plain_message = strip_tags(html_message)

            send_mail(
                subject='Welcome to Promethia! 🎉',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=True,  # Don't fail registration if email fails
                timeout=settings.EMAIL_TIMEOUT,
            )
        except Exception as e:
            # Log the error but don't fail the registration
            logger.warning("Failed to send welcome email", extra={"user_email": user.email, "error": str(e)})

        return Response(
            APIResponse.success(
                data={'user': UserSerializer(user, context={'request': request}).data},
                message="User registered successfully",
                status_code=status.HTTP_201_CREATED
            ),
            status=status.HTTP_201_CREATED
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    User login endpoint.
    """
    serializer = UserLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    user = serializer.validated_data['user']
    refresh = RefreshToken.for_user(user)
    
    return Response(
        APIResponse.success(
            data={
                'user': UserSerializer(user, context={'request': request}).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            },
            message="Login successful"
        )
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    User logout endpoint.
    """
    try:
        refresh_token = request.data["refresh_token"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        
        return Response(
            APIResponse.success(message="Logout successful")
        )
    except Exception as e:
        return Response(
            APIResponse.error(message="Invalid token"),
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """
    Get user profile endpoint.
    """
    serializer = UserSerializer(request.user, context={'request': request})
    return Response(
        APIResponse.success(
            data=serializer.data,
            message="Profile retrieved successfully"
        )
    )


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """
    Update user profile endpoint.
    """
    serializer = UserSerializer(
        request.user,
        data=request.data,
        partial=request.method == 'PATCH',
        context={'request': request}
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    
    return Response(
        APIResponse.success(
            data=serializer.data,
            message="Profile updated successfully"
        )
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """
    Change password endpoint.
    """
    serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    
    request.user.set_password(serializer.validated_data['new_password'])
    request.user.save()
    
    return Response(
        APIResponse.success(message="Password changed successfully")
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_view(request):
    """
    Password reset endpoint - sends reset email with token.
    """
    serializer = PasswordResetSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    email = serializer.validated_data['email']
    user = User.objects.get(email=email)

    # Generate password reset token
    token_generator = PasswordResetTokenGenerator()
    token = token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    # Create reset link
    frontend_url = settings.FRONTEND_URL
    reset_link = f"{frontend_url}/reset-password/{uid}/{token}"

    # Prepare email context
    context = {
        'user': user,
        'reset_link': reset_link,
        'site_name': 'Promethia',
    }

    # Render email
    html_message = render_to_string('emails/password_reset.html', context)
    plain_message = strip_tags(html_message)

    # Send email
    try:
        send_mail(
            subject='Reset Your Promethia Password',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
            timeout=settings.EMAIL_TIMEOUT,
        )

        return Response(
            APIResponse.success(
                message=f"Password reset email sent to {email}"
            )
        )
    except Exception as e:
        logger.exception("Password reset email failed", extra={"user_email": email})
        return Response(
            APIResponse.error(message="Failed to send email. Please try again later."),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    """
    Password reset confirmation endpoint - validates token and updates password.
    """
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    token = serializer.validated_data['token']
    new_password = serializer.validated_data['new_password']

    # Extract uid and token from the combined token
    try:
        # Token format is {uid}-{token}
        uid, reset_token = token.split('-', 1)
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (ValueError, User.DoesNotExist, TypeError, OverflowError):
        return Response(
            APIResponse.error(message="Invalid or expired reset link."),
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate token
    token_generator = PasswordResetTokenGenerator()
    if not token_generator.check_token(user, reset_token):
        return Response(
            APIResponse.error(message="Invalid or expired reset link."),
            status=status.HTTP_400_BAD_REQUEST
        )

    # Update password
    user.set_password(new_password)
    user.save()

    return Response(
        APIResponse.success(
            message="Password has been reset successfully. You can now log in with your new password."
        )
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token_view(request):
    """
    Refresh JWT token endpoint.
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            refresh = RefreshToken(refresh_token)
            return Response(
                APIResponse.success(
                    data={
                        'access': str(refresh.access_token),
                        'refresh': str(refresh),
                    },
                    message="Token refreshed successfully"
                )
            )
        else:
            return Response(
                APIResponse.error(message="Refresh token required"),
                status=status.HTTP_400_BAD_REQUEST
            )
    except Exception as e:
        return Response(
            APIResponse.error(message="Invalid refresh token"),
            status=status.HTTP_401_UNAUTHORIZED
        )
logger = logging.getLogger(__name__)
