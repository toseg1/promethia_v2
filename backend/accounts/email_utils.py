"""
Email utility functions for sending emails asynchronously without blocking requests
"""
import threading
import logging
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

logger = logging.getLogger(__name__)


def send_email_async(subject, template_name, context, recipient_email):
    """
    Send email asynchronously in a background thread.

    This allows the API to respond immediately while the email is sent in the background.
    The user doesn't have to wait for email delivery.

    Args:
        subject: Email subject line
        template_name: Path to email template (e.g., 'emails/welcome.html')
        context: Template context dictionary
        recipient_email: Email address to send to
    """
    def send_email_task():
        """Internal function that runs in background thread"""
        try:
            # Render email template
            html_message = render_to_string(template_name, context)
            plain_message = strip_tags(html_message)

            # Send email
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                html_message=html_message,
                fail_silently=False,
            )

            logger.info(f"Email '{subject}' sent successfully to {recipient_email}")

        except Exception as e:
            # Log error but don't crash - email sending is non-critical
            logger.error(f"Failed to send email '{subject}' to {recipient_email}: {str(e)}", exc_info=True)

    # Start background thread to send email
    thread = threading.Thread(target=send_email_task, daemon=True)
    thread.start()

    logger.info(f"Email '{subject}' queued for sending to {recipient_email}")


def send_welcome_email(user, login_url):
    """
    Send welcome email to newly registered user.
    Returns immediately while email is sent in background.

    Args:
        user: User instance
        login_url: URL to login page
    """
    context = {
        'user': user,
        'login_url': login_url,
        'site_name': 'Promethia',
    }

    send_email_async(
        subject='Welcome to Promethia!',
        template_name='emails/welcome.html',
        context=context,
        recipient_email=user.email
    )


def send_password_reset_email(user, reset_link):
    """
    Send password reset email to user.
    Returns immediately while email is sent in background.

    Args:
        user: User instance
        reset_link: URL to password reset page
    """
    context = {
        'user': user,
        'reset_link': reset_link,
        'site_name': 'Promethia',
    }

    send_email_async(
        subject='Reset Your Promethia Password',
        template_name='emails/password_reset.html',
        context=context,
        recipient_email=user.email
    )
