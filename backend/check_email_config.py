#!/usr/bin/env python
"""
Check email configuration in production
Run with: python manage.py shell < check_email_config.py
Or: python check_email_config.py
"""

import os
import sys
import django

# Setup Django if running standalone
if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(__file__))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()

from django.conf import settings

def check_email_configuration():
    """Check all email-related settings"""

    print("\n" + "="*60)
    print("EMAIL CONFIGURATION CHECK")
    print("="*60)

    # Basic settings
    print(f"\n📧 EMAIL BACKEND:")
    print(f"   {settings.EMAIL_BACKEND}")

    print(f"\n🌐 EMAIL HOST:")
    host = settings.EMAIL_HOST
    print(f"   {host if host else '❌ NOT SET'}")

    print(f"\n🔢 EMAIL PORT:")
    print(f"   {settings.EMAIL_PORT}")

    print(f"\n🔐 EMAIL USE TLS:")
    print(f"   {settings.EMAIL_USE_TLS}")

    print(f"\n👤 EMAIL HOST USER:")
    user = settings.EMAIL_HOST_USER
    if user:
        # Mask the email for security
        masked_user = user[:3] + "***" + user[user.find('@'):] if '@' in user else "***"
        print(f"   {masked_user}")
    else:
        print(f"   ❌ NOT SET")

    print(f"\n🔑 EMAIL HOST PASSWORD:")
    password = settings.EMAIL_HOST_PASSWORD
    if password:
        print(f"   ✅ SET (length: {len(password)} chars)")
    else:
        print(f"   ❌ NOT SET")

    print(f"\n📤 DEFAULT FROM EMAIL:")
    from_email = settings.DEFAULT_FROM_EMAIL
    print(f"   {from_email if from_email != 'noreply@example.com' else '❌ USING DEFAULT (not configured)'}")

    print(f"\n⏱️  EMAIL TIMEOUT:")
    print(f"   {settings.EMAIL_TIMEOUT} seconds")

    print(f"\n🌍 FRONTEND URL:")
    print(f"   {settings.FRONTEND_URL}")

    print(f"\n🐛 DEBUG MODE:")
    print(f"   {settings.DEBUG}")

    print("\n" + "="*60)
    print("DIAGNOSIS")
    print("="*60)

    issues = []

    # Check for common issues
    if not settings.EMAIL_HOST or settings.EMAIL_HOST == '':
        issues.append("❌ EMAIL_HOST is not set")

    if not settings.EMAIL_HOST_USER or settings.EMAIL_HOST_USER == '':
        issues.append("❌ EMAIL_HOST_USER is not set")

    if not settings.EMAIL_HOST_PASSWORD or settings.EMAIL_HOST_PASSWORD == '':
        issues.append("❌ EMAIL_HOST_PASSWORD is not set")

    if settings.DEFAULT_FROM_EMAIL == 'noreply@example.com':
        issues.append("⚠️  DEFAULT_FROM_EMAIL is using default value")

    if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
        issues.append("⚠️  EMAIL_BACKEND is set to console (emails won't be sent)")

    if settings.FRONTEND_URL == 'http://localhost:3000':
        issues.append("⚠️  FRONTEND_URL is set to localhost (should be https://promethia.app)")

    if issues:
        print("\n❌ ISSUES FOUND:\n")
        for issue in issues:
            print(f"   {issue}")
        print("\n👉 Fix these issues in Render Dashboard → Environment Variables")
    else:
        print("\n✅ All configuration looks good!")
        print("\nIf emails still don't work, check:")
        print("1. SMTP server is reachable from Render")
        print("2. Email credentials are correct")
        print("3. App password is used (not regular password for Gmail)")
        print("4. Check Render logs for connection errors")

    print("\n" + "="*60)

    # Test SMTP connection
    print("\nWould you like to test SMTP connection? (y/n): ", end='')
    test_connection = input().strip().lower()

    if test_connection == 'y':
        print("\nTesting SMTP connection...")
        test_smtp_connection()

def test_smtp_connection():
    """Test SMTP connection"""
    import socket
    import smtplib
    from django.conf import settings

    print(f"\nConnecting to {settings.EMAIL_HOST}:{settings.EMAIL_PORT}...")

    try:
        # Test socket connection
        sock = socket.create_connection(
            (settings.EMAIL_HOST, settings.EMAIL_PORT),
            timeout=settings.EMAIL_TIMEOUT
        )
        print("✅ Socket connection successful")
        sock.close()

        # Test SMTP authentication
        if settings.EMAIL_USE_TLS:
            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=settings.EMAIL_TIMEOUT)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=settings.EMAIL_TIMEOUT)

        if settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD:
            server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
            print("✅ SMTP authentication successful")

        server.quit()
        print("\n✅ SMTP connection test PASSED!")
        print("Your email configuration is working correctly.")

    except socket.timeout:
        print(f"\n❌ Connection timeout after {settings.EMAIL_TIMEOUT} seconds")
        print("   The SMTP server might be unreachable from Render's network")
    except smtplib.SMTPAuthenticationError as e:
        print(f"\n❌ Authentication failed: {str(e)}")
        print("   Check your EMAIL_HOST_USER and EMAIL_HOST_PASSWORD")
        print("   For Gmail, use an App Password, not your regular password")
    except Exception as e:
        print(f"\n❌ Connection failed: {str(e)}")
        print(f"   Error type: {type(e).__name__}")

if __name__ == '__main__':
    check_email_configuration()
