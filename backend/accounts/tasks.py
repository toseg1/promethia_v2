"""
Celery tasks for accounts app
"""
from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email(self, user_email, reset_link, user_first_name=''):
    """
    Send password reset email asynchronously

    Args:
        user_email: Email address to send to
        reset_link: Password reset link
        user_first_name: User's first name for personalization
    """
    try:
        # Prepare email context
        context = {
            'user': {'first_name': user_first_name, 'email': user_email},
            'reset_link': reset_link,
            'site_name': 'Promethia',
        }

        # Render email
        html_message = render_to_string('emails/password_reset.html', context)
        plain_message = strip_tags(html_message)

        # Send email with timeout
        send_mail(
            subject='Reset Your Promethia Password',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f"Password reset email sent successfully to {user_email}")
        return {'success': True, 'email': user_email}

    except Exception as exc:
        logger.error(f"Failed to send password reset email to {user_email}: {str(exc)}")
        # Retry the task
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for password reset email to {user_email}")
            return {'success': False, 'email': user_email, 'error': str(exc)}
