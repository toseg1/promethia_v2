from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a superuser if none exists'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Email for the superuser')
        parser.add_argument('--password', type=str, help='Password for the superuser')

    def handle(self, *args, **options):
        if User.objects.filter(is_superuser=True).exists():
            # Try to update existing superuser if needed
            admin_user = User.objects.filter(is_superuser=True).first()
            updated = False
            
            if not admin_user.first_name:
                admin_user.first_name = 'Admin'
                updated = True
            if not admin_user.last_name:
                admin_user.last_name = 'User'
                updated = True
            if not admin_user.phone_number:
                admin_user.phone_number = '5555551234'
                updated = True
            if admin_user.country_number in ['', '+1'] or not admin_user.country_number:
                admin_user.country_number = '+1'
                updated = True
            if admin_user.user_type != 'coach':
                admin_user.user_type = 'coach'
                updated = True
                
            if updated:
                admin_user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Updated existing superuser: {admin_user.get_full_name()}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Superuser already exists: {admin_user.get_full_name()}')
                )
            return

        email = options['email'] or 'admin@example.com'
        password = options['password'] or 'admin123'
        
        # Create superuser with all required fields
        admin_user = User.objects.create_superuser(
            username='admin',
            email=email,
            password=password,
            first_name='Admin',
            last_name='User',
            country_number='+1',
            phone_number='5555551234',
            user_type='coach'
        )
        
        self.stdout.write(
            self.style.SUCCESS(f'Superuser created successfully: {admin_user.get_full_name()} ({email})')
        )