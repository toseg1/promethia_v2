from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Update existing admin user with required fields'

    def handle(self, *args, **options):
        try:
            # Find existing admin/superuser
            admin_user = User.objects.filter(is_superuser=True).first()
            
            if not admin_user:
                self.stdout.write(
                    self.style.ERROR('No superuser found. Please create one first.')
                )
                return
            
            # Update required fields if they're empty/default
            updated_fields = []
            
            if not admin_user.first_name:
                admin_user.first_name = 'Admin'
                updated_fields.append('first_name')
            
            if not admin_user.last_name:
                admin_user.last_name = 'User'
                updated_fields.append('last_name')
            
            if not admin_user.phone_number:
                admin_user.phone_number = '5555551234'
                updated_fields.append('phone_number')
            
            if admin_user.country_number == '+1' or not admin_user.country_number:
                admin_user.country_number = '+1'
                if 'country_number' not in updated_fields:
                    updated_fields.append('country_number')
            
            if not admin_user.user_type or admin_user.user_type == 'athlete':
                admin_user.user_type = 'coach'
                updated_fields.append('user_type')
            
            if updated_fields:
                admin_user.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Updated admin user "{admin_user.get_full_name()}" ({admin_user.email})'
                    )
                )
                self.stdout.write(f'Updated fields: {", ".join(updated_fields)}')
                self.stdout.write(f'Phone: {admin_user.full_phone_number}')
                self.stdout.write(f'User type: {admin_user.get_user_type_display()}')
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Admin user "{admin_user.get_full_name()}" is already properly configured.'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error updating admin user: {e}')
            )