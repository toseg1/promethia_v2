# Generated manually to separate phone number data

from django.db import migrations
import re

def separate_phone_numbers(apps, schema_editor):
    """
    Fix existing phone number data by separating country codes from phone numbers
    """
    User = apps.get_model('accounts', 'User')
    
    # Common country codes and their dial codes
    country_codes = {
        '+1': '+1',      # US/Canada
        '+33': '+33',    # France
        '+44': '+44',    # UK
        '+49': '+49',    # Germany
        '+34': '+34',    # Spain
        '+39': '+39',    # Italy
        '+61': '+61',    # Australia
        '+81': '+81',    # Japan
        '+82': '+82',    # South Korea
        '+86': '+86',    # China
        '+91': '+91',    # India
        '+55': '+55',    # Brazil
        '+52': '+52',    # Mexico
        '+54': '+54',    # Argentina
        '+56': '+56',    # Chile
        '+57': '+57',    # Colombia
        '+51': '+51',    # Peru
        '+58': '+58',    # Venezuela
        '+27': '+27',    # South Africa
        '+20': '+20',    # Egypt
        '+234': '+234',  # Nigeria
        '+254': '+254',  # Kenya
        '+212': '+212',  # Morocco
        '+216': '+216',  # Tunisia
        '+7': '+7',      # Russia
        '+90': '+90',    # Turkey
        '+966': '+966',  # Saudi Arabia
        '+971': '+971',  # UAE
        '+972': '+972',  # Israel
    }
    
    for user in User.objects.all():
        if user.phone_number:
            # Remove any formatting
            clean_phone = user.phone_number.replace(' ', '').replace('-', '').replace('(', '').replace(')', '').replace('.', '')
            
            # Try to extract country code
            country_found = False
            for dial_code in sorted(country_codes.keys(), key=len, reverse=True):  # Longest first to avoid false matches
                if clean_phone.startswith(dial_code):
                    local_number = clean_phone[len(dial_code):]
                    if local_number:  # Make sure there's a local number left
                        user.country_number = dial_code
                        user.phone_number = local_number
                        country_found = True
                        break
            
            # If no country code found and it's just digits, assume it's already local
            if not country_found and re.match(r'^\d+$', clean_phone):
                # Keep existing phone_number as is (assume it's already local)
                # country_number will remain at its default value
                pass
            elif not country_found:
                # Invalid format, clear it
                user.phone_number = ''
            
            user.save(update_fields=['country_number', 'phone_number'])

def reverse_separate_phone_numbers(apps, schema_editor):
    """
    Reverse the separation by combining country_number and phone_number back into phone_number
    """
    User = apps.get_model('accounts', 'User')
    
    for user in User.objects.all():
        if user.country_number and user.phone_number:
            user.phone_number = f"{user.country_number}{user.phone_number}"
            user.save(update_fields=['phone_number'])

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0017_fix_phone_number_separation'),
    ]

    operations = [
        migrations.RunPython(
            separate_phone_numbers,
            reverse_separate_phone_numbers
        ),
    ]