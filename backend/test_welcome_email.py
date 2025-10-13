#!/usr/bin/env python
"""
Test welcome email template by sending it to yourself
Run with: python manage.py shell < test_welcome_email.py
Or: python test_welcome_email.py
"""

import os
import sys
import django

# Setup Django if running standalone
if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(__file__))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()

from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings
from accounts.models import User

def send_test_welcome_email():
    """Send test welcome email to yourself"""

    # Get your email address
    test_email = input("Enter your email address to receive the test welcome email: ").strip()

    if not test_email:
        print("❌ Email address is required!")
        return

    # Create a fake user object for template context
    class FakeUser:
        first_name = "John"
        last_name = "Doe"
        email = test_email

    user = FakeUser()
    login_url = f"{settings.FRONTEND_URL}/"

    # Render the template
    context = {
        'user': user,
        'login_url': login_url,
        'site_name': 'Promethia',
    }

    html_message = render_to_string('emails/welcome.html', context)
    from django.utils.html import strip_tags
    plain_message = strip_tags(html_message)

    print("\n" + "="*60)
    print("SENDING TEST WELCOME EMAIL")
    print("="*60)
    print(f"To: {test_email}")
    print(f"From: {settings.DEFAULT_FROM_EMAIL}")
    print(f"Email Backend: {settings.EMAIL_BACKEND}")
    print("="*60 + "\n")

    try:
        send_mail(
            subject='[TEST] Welcome to Promethia!',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[test_email],
            html_message=html_message,
            fail_silently=False,
        )

        print("✅ Test welcome email sent successfully!")
        print(f"📧 Check your inbox at: {test_email}")
        print("\nIf using console backend (development), the email is printed above.")

    except Exception as e:
        print(f"❌ Failed to send test email: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Check your EMAIL_HOST, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD in .env")
        print("2. If using Gmail, make sure you're using an App Password")
        print("3. Check that EMAIL_BACKEND is set to smtp.EmailBackend")

if __name__ == '__main__':
    send_test_welcome_email()
