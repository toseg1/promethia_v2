#!/usr/bin/env python
"""
Test email configuration
Run with: python manage.py shell < test_email.py
Or: python test_email.py
"""

import os
import sys
import django

# Setup Django if running standalone
if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(__file__))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()

import time
from django.core.mail import send_mail
from django.conf import settings

def test_email_connection():
    """Test SMTP connection and email sending"""

    print("=" * 60)
    print("EMAIL CONFIGURATION TEST")
    print("=" * 60)

    # Display current settings
    print(f"\n📧 Email Backend: {settings.EMAIL_BACKEND}")
    print(f"📧 SMTP Host: {settings.EMAIL_HOST}")
    print(f"📧 SMTP Port: {settings.EMAIL_PORT}")
    print(f"📧 Use TLS: {settings.EMAIL_USE_TLS}")
    print(f"📧 Use SSL: {settings.EMAIL_USE_SSL}")
    print(f"📧 From Email: {settings.DEFAULT_FROM_EMAIL}")
    print(f"📧 Email Timeout: {getattr(settings, 'EMAIL_TIMEOUT', 'Not set')}")

    # Test basic socket connection
    print("\n" + "-" * 60)
    print("TEST 1: Socket Connection to SMTP Server")
    print("-" * 60)

    import socket
    start = time.time()
    try:
        sock = socket.create_connection(
            (settings.EMAIL_HOST, settings.EMAIL_PORT),
            timeout=getattr(settings, 'EMAIL_TIMEOUT', 10)
        )
        elapsed = time.time() - start
        print(f"✅ Connected successfully in {elapsed:.2f}s")
        sock.close()
    except Exception as e:
        elapsed = time.time() - start
        print(f"❌ Connection failed after {elapsed:.2f}s")
        print(f"   Error: {e}")
        return False

    # Test SMTP authentication
    print("\n" + "-" * 60)
    print("TEST 2: SMTP Authentication")
    print("-" * 60)

    import smtplib
    start = time.time()
    try:
        if settings.EMAIL_USE_SSL:
            server = smtplib.SMTP_SSL(
                settings.EMAIL_HOST,
                settings.EMAIL_PORT,
                timeout=getattr(settings, 'EMAIL_TIMEOUT', 10)
            )
        else:
            server = smtplib.SMTP(
                settings.EMAIL_HOST,
                settings.EMAIL_PORT,
                timeout=getattr(settings, 'EMAIL_TIMEOUT', 10)
            )
            if settings.EMAIL_USE_TLS:
                server.starttls()

        if settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD:
            server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)

        elapsed = time.time() - start
        print(f"✅ Authenticated successfully in {elapsed:.2f}s")
        server.quit()
    except Exception as e:
        elapsed = time.time() - start
        print(f"❌ Authentication failed after {elapsed:.2f}s")
        print(f"   Error: {e}")
        return False

    # Test sending actual email
    print("\n" + "-" * 60)
    print("TEST 3: Send Test Email")
    print("-" * 60)

    test_email = input("Enter email address to send test to (or press Enter to skip): ").strip()

    if test_email:
        start = time.time()
        try:
            send_mail(
                subject='Promethia Email Test',
                message='This is a test email from Promethia. If you received this, email is working correctly!',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[test_email],
                fail_silently=False,
            )
            elapsed = time.time() - start
            print(f"✅ Email sent successfully in {elapsed:.2f}s")
            print(f"   Check {test_email} for the test email")
        except Exception as e:
            elapsed = time.time() - start
            print(f"❌ Failed to send email after {elapsed:.2f}s")
            print(f"   Error: {e}")
            return False
    else:
        print("⏭️  Skipped email sending test")

    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    return True

if __name__ == '__main__':
    success = test_email_connection()
    sys.exit(0 if success else 1)
