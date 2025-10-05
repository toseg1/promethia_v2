import re
import secrets
import string
from datetime import date
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db.models.signals import post_save
from django.dispatch import receiver


def validate_phone_number(value):
    """Validate phone number format (local number only, without country code)"""
    if not value:  # Allow empty values for existing users
        return
    # Local phone number without country code - digits only with optional formatting
    phone_pattern = re.compile(r'^[\d\s\-\(\)\.]{7,15}$')
    if not phone_pattern.match(value):
        raise ValidationError('Phone number must be a local number (7-15 digits, no country code).')


def validate_mas(value):
    """Validate MAS (Maximum Aerobic Speed) in km/h"""
    if value is not None:
        if value <= 0:
            raise ValidationError('MAS must be a positive value in km/h.')
        if value > 50:  # Reasonable upper limit for human running speed
            raise ValidationError('MAS value seems unreasonably high. Please check your input.')


def validate_fpp(value):
    """Validate FPP (Functional Power Profile) in watts"""
    if value is not None:
        if value <= 0:
            raise ValidationError('FPP must be a positive value in watts.')
        if value > 2000:  # Reasonable upper limit for cycling power
            raise ValidationError('FPP value seems unreasonably high. Please check your input.')


def validate_css(value):
    """Validate CSS as time in mm:ss format, stored as total seconds"""
    if value is not None:
        if value <= 0:
            raise ValidationError('CSS must be a positive time value.')
        if value > 3600:  # 60 minutes seems like a reasonable upper limit
            raise ValidationError('CSS time seems unreasonably high. Please check your input.')


def css_display(seconds):
    """Convert CSS seconds to mm:ss format for display"""
    if seconds is None:
        return None
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"


def css_parse(time_str):
    """Parse mm:ss format to total seconds for CSS storage"""
    if not time_str:
        return None
    try:
        if ':' in time_str:
            minutes, seconds = time_str.split(':')
            return int(minutes) * 60 + int(seconds)
        else:
            # If just a number, treat as total seconds
            return float(time_str)
    except (ValueError, TypeError):
        raise ValidationError('CSS must be in mm:ss format (e.g., "05:30" for 5 minutes 30 seconds).')


def generate_unique_coach_id():
    """
    Generate a unique coach ID with letters, numbers, and symbols.
    Format: 3 letters + 3 numbers + 2 symbols (e.g., ABC123@#)
    """
    # Define character sets
    letters = string.ascii_uppercase
    numbers = string.digits
    symbols = '!@#$%&*+-='
    
    def generate_id():
        # Generate 3 random letters
        letter_part = ''.join(secrets.choice(letters) for _ in range(3))
        # Generate 3 random numbers
        number_part = ''.join(secrets.choice(numbers) for _ in range(3))
        # Generate 2 random symbols
        symbol_part = ''.join(secrets.choice(symbols) for _ in range(2))
        
        return f"{letter_part}{number_part}{symbol_part}"
    
    # During migrations or when DB isn't ready, just generate without checking
    try:
        from django.apps import apps
        from django.db import connection
        
        # Check if we can access the database
        if connection.introspection.table_exists('accounts_user'):
            User = apps.get_model('accounts', 'User')
            
            # Keep generating until we find a unique one
            max_attempts = 100
            attempts = 0
            
            while attempts < max_attempts:
                coach_id = generate_id()
                
                if not User.objects.filter(coach_id=coach_id).exists():
                    return coach_id
                
                attempts += 1
                
            # Fallback with timestamp
            import time
            timestamp_suffix = str(int(time.time()))[-4:]
            base_id = generate_id()[:-1]
            return f"{base_id}{timestamp_suffix[-1]}"
        else:
            # Table doesn't exist yet, just return a generated ID
            return generate_id()
            
    except (ImportError, Exception):
        # If anything goes wrong, just generate an ID
        return generate_id()


def get_default_coach_id():
    """Get a unique coach ID for new users"""
    return generate_unique_coach_id()


from django.contrib.auth.models import BaseUserManager

class UserManager(BaseUserManager):
    """Custom manager for User model"""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular User with the given email and password."""
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        
        # Set default username if not provided
        if 'username' not in extra_fields:
            extra_fields['username'] = email
            
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('user_type', 'coach')  # Superusers are typically coaches

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)
    
    def get_athletes(self):
        """Get all users with user_type 'athlete'"""
        return self.filter(user_type='athlete', is_active=True)
    
    def get_coaches(self):
        """Get all users with user_type 'coach'"""
        return self.filter(user_type='coach', is_active=True)
    
    def get_by_coach(self, coach):
        """Get all athletes assigned to a specific coach via CoachAssignment"""
        # Get active coach assignments for this coach
        from django.apps import apps
        if apps.ready:
            CoachAssignment = apps.get_model('accounts', 'CoachAssignment')
            assigned_mentee_ids = CoachAssignment.objects.filter(
                coach=coach,
                is_active=True
            ).values_list('mentee_id', flat=True)
            
            return self.filter(
                id__in=assigned_mentee_ids,
                user_type='athlete',
                is_active=True
            )
        return self.none()


class User(AbstractUser):
    USER_TYPE_CHOICES = [
        ('athlete', 'Athlete'),
        ('coach', 'Coach'),
    ]
    
    # Core required fields for signup
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30, default='')
    last_name = models.CharField(max_length=30, default='')
    country_number = models.CharField(
        max_length=10,
        default='+1',
        validators=[RegexValidator(
            regex=r'^\+\d{1,3}$',
            message='Country code must be in format: +1 to +999'
        )],
        help_text='Country code (e.g., +1, +44, +33)'
    )
    phone_number = models.CharField(
        max_length=20,
        default='',
        validators=[validate_phone_number],
        help_text='Local phone number without country code'
    )
    user_type = models.CharField(
        max_length=10,
        choices=USER_TYPE_CHOICES,
        default='athlete',
        help_text='User type: athlete or coach'
    )
    
    # Optional fields
    date_of_birth = models.DateField(null=True, blank=True)
    profile_image = models.ImageField(upload_to='profiles/', null=True, blank=True)
    
    # Unique Coach ID for both athletes and coaches
    coach_id = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        help_text='Unique identifier for coach-athlete relationships'
    )
    
    # Performance metrics (available for both athletes and coaches)
    mas = models.FloatField(
        null=True, 
        blank=True,
        validators=[validate_mas],
        help_text='Maximum Aerobic Speed in km/h (e.g., 18.5)',
        verbose_name='MAS'
    )
    fpp = models.FloatField(
        null=True, 
        blank=True,
        validators=[validate_fpp],
        help_text='Functional Power Profile in watts (e.g., 250)',
        verbose_name='FPP'
    )
    css = models.FloatField(
        null=True, 
        blank=True,
        validators=[validate_css],
        help_text='Critical Swim Speed - enter total seconds (convert from mm:ss using helper functions)',
        verbose_name='CSS'
    )
    
    # Coach relationships are now handled via the CoachAssignment model only
    
    # System fields
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name', 'user_type']
    
    objects = UserManager()

    class Meta:
        db_table = 'accounts_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['user_type']),
            models.Index(fields=['coach_id']),
            models.Index(fields=['created_at']),
        ]

    def clean(self):
        super().clean()
        
        # Coach relationships are now managed via CoachAssignment model
        
        # Validate date of birth
        if self.date_of_birth and self.date_of_birth > date.today():
            raise ValidationError('Date of birth cannot be in the future.')

    def save(self, *args, **kwargs):
        # Generate coach_id if not present
        if not self.coach_id:
            self.coach_id = generate_unique_coach_id()
        
        # Only run full_clean if not updating specific fields
        if 'update_fields' not in kwargs:
            self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    @property
    def full_name(self):
        """Get user's full name"""
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def age(self):
        """Calculate age from date of birth"""
        if not self.date_of_birth:
            return None
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    @property
    def full_phone_number(self):
        """Get complete phone number with country code"""
        return f"{self.country_number}{self.phone_number}"

    @property
    def css_display(self):
        """Get CSS in mm:ss format for display"""
        return css_display(self.css)

    def set_css_from_time(self, time_str):
        """Set CSS from mm:ss format string"""
        self.css = css_parse(time_str)

    def get_full_name(self):
        """Django method for full name"""
        return self.full_name

    def get_short_name(self):
        """Django method for short name"""
        return self.first_name

    def is_athlete(self):
        """Check if user is an athlete"""
        return self.user_type == 'athlete'

    def is_coach(self):
        """Check if user is a coach"""
        return self.user_type == 'coach'

    def get_assigned_mentees(self):
        """Get users assigned to this coach/mentor via CoachAssignment model"""
        return self.get_active_mentees_via_assignments()

    def get_active_coaches(self):
        """Get all active coaches assigned to this user"""
        from django.apps import apps
        if apps.ready:
            CoachAssignment = apps.get_model('accounts', 'CoachAssignment')
            assignments = CoachAssignment.objects.filter(
                mentee=self,
                is_active=True
            ).select_related('coach')
            return [assignment.coach for assignment in assignments]
        return []

    def get_active_mentees_via_assignments(self):
        """Get all active mentees assigned via the CoachAssignment model"""
        from django.apps import apps
        if apps.ready:
            CoachAssignment = apps.get_model('accounts', 'CoachAssignment')
            assignments = CoachAssignment.objects.filter(
                coach=self,
                is_active=True
            ).select_related('mentee')
            return [assignment.mentee for assignment in assignments]
        return []

    def add_coach(self, coach_user, assignment_type='primary', notes=''):
        """Add a coach/mentor to this user"""
        from django.apps import apps
        if apps.ready:
            CoachAssignment = apps.get_model('accounts', 'CoachAssignment')
            assignment = CoachAssignment.objects.create(
                mentee=self,
                coach=coach_user,
                assignment_type=assignment_type,
                notes=notes
            )
            return assignment
        return None

    def remove_coach(self, coach_user):
        """Remove a coach/mentor from this user (hard delete)"""
        from django.apps import apps
        if apps.ready:
            CoachAssignment = apps.get_model('accounts', 'CoachAssignment')
            assignments = CoachAssignment.objects.filter(
                mentee=self,
                coach=coach_user,
                is_active=True
            )
            count = assignments.count()
            assignments.delete()  # Hard delete for database efficiency
            return count
        return 0

    def get_coaching_summary(self):
        """Get a summary of all coaching relationships"""
        coaches = self.get_active_coaches()
        mentees = self.get_active_mentees_via_assignments()
        
        return {
            'coaches_count': len(coaches),
            'mentees_count': len(mentees),
            'coaches': [
                {
                    'id': coach.id,
                    'username': coach.username,
                    'full_name': coach.get_full_name(),
                    'email': coach.email,
                    'country_number': coach.country_number,
                    'phone_number': coach.phone_number,
                    'full_phone_number': coach.full_phone_number,
                    'profile_image': coach.profile_image.url if coach.profile_image else None,
                } for coach in coaches
            ],
            'mentees': [
                {
                    'id': mentee.id,
                    'username': mentee.username,
                    'full_name': mentee.get_full_name(),
                    'email': mentee.email,
                    'country_number': mentee.country_number,
                    'phone_number': mentee.phone_number,
                    'full_phone_number': mentee.full_phone_number,
                    'profile_image': mentee.profile_image.url if mentee.profile_image else None,
                } for mentee in mentees
            ],
        }

    def add_coach_access(self, coach_id_code, notes=''):
        """
        Add a coach by their coach_id code. This grants them access to YOUR calendar data.
        
        Args:
            coach_id_code: The coach_id of the coach you want to grant access to
            notes: Optional notes about why you're granting access
        """
        try:
            coach_user = User.objects.get(coach_id=coach_id_code)
            
            # Check if connection already exists
            from django.apps import apps
            if apps.ready:
                CoachAssignment = apps.get_model('accounts', 'CoachAssignment')
                existing = CoachAssignment.objects.filter(
                    mentee=self,
                    coach=coach_user,
                    is_active=True
                ).first()
                
                if existing:
                    return {
                        'success': True,
                        'message': f'{coach_user.get_full_name()} already has access to your calendar',
                        'assignment': existing,
                        'coach': coach_user,
                        'already_connected': True
                    }
                
                # Create the connection - coach can access mentee's (self) data
                assignment = CoachAssignment.objects.create(
                    mentee=self,  # I am granting access to MY data
                    coach=coach_user,  # This person gets access
                    notes=notes
                )
                
                return {
                    'success': True,
                    'message': f'✅ {coach_user.get_full_name()} can now access your calendar data.',
                    'assignment': assignment,
                    'coach': coach_user,
                    'already_connected': False
                }
            
        except User.DoesNotExist:
            return {
                'success': False,
                'message': f'No user found with coach_id: {coach_id_code}',
                'assignment': None
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Error granting access: {str(e)}',
                'assignment': None
            }

    def get_my_coach_id(self):
        """Get this user's coach_id for sharing with others"""
        return {
            'coach_id': self.coach_id,
            'full_name': self.get_full_name(),
            'user_type': self.user_type,
            'message': f'Your coach_id: {self.coach_id} - Others can add this code to grant you access to their calendar'
        }

    def get_who_can_access_my_calendar(self):
        """Get all users who have access to this user's calendar data"""
        from django.apps import apps
        if apps.ready:
            CoachAssignment = apps.get_model('accounts', 'CoachAssignment')
            # Users who I granted access to (they can access MY calendar)
            connections = CoachAssignment.objects.filter(
                mentee=self,  # I am the mentee (data owner)
                is_active=True
            ).select_related('coach')
            
            return [
                {
                    'user': conn.coach,
                    'start_date': conn.start_date,
                    'notes': conn.notes
                }
                for conn in connections
            ]
        return []

    def get_calendars_i_can_access(self):
        """Get all calendars this user has access to (users who granted me access)"""
        from django.apps import apps
        if apps.ready:
            CoachAssignment = apps.get_model('accounts', 'CoachAssignment')
            # Users who granted me access to their calendar
            connections = CoachAssignment.objects.filter(
                coach=self,  # I am the coach (granted access)
                is_active=True
            ).select_related('mentee')
            
            return [
                {
                    'user': conn.mentee,
                    'start_date': conn.start_date,
                    'notes': conn.notes
                }
                for conn in connections
            ]
        return []

    # Old methods removed - use connect_to_coach_id() and CoachAssignment model instead

    @property
    def coach_display_id(self):
        """Get a user-friendly display of the coach ID"""
        return self.coach_id


class AthleticProfile(models.Model):
    """Profile model for athletes"""
    
    SPORTS_CHOICES = [
        ('running', 'Running'),
        ('cycling', 'Cycling'),
        ('swimming', 'Swimming'),
        ('triathlon', 'Triathlon'),
        ('strength', 'Strength'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='athletic_profile'
    )
    experience_years = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Years of experience in sports (optional)'
    )
    about_notes = models.TextField(
        blank=True,
        help_text='Additional notes about the athlete'
    )
    sports_involved = models.JSONField(
        default=list,
        blank=True,
        help_text='Sports involved (multiple selection from: running, cycling, swimming, triathlon - optional)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Athletic Profile'
        verbose_name_plural = 'Athletic Profiles'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['sports_involved']),
        ]

    def clean(self):
        super().clean()
        # Allow athletic profiles for all users - role only determines UI view
        pass

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.get_full_name()} - Athletic Profile"

    @property
    def total_achievements(self):
        """Get total number of achievements"""
        return self.achievements.count()

    @property
    def recent_achievements(self):
        """Get achievements from the last 2 years"""
        from datetime import datetime
        current_year = datetime.now().year
        return self.achievements.filter(year__gte=current_year - 1)


class ProfessionalProfile(models.Model):
    """Profile model for coaches"""
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='professional_profile'
    )
    experience_years = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Years of coaching experience (optional)'
    )
    about_notes = models.TextField(
        blank=True,
        help_text='Professional background and expertise'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Professional Profile'
        verbose_name_plural = 'Professional Profiles'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
        ]

    def clean(self):
        super().clean()
        # Allow professional profiles for all users - role only determines UI view
        pass

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.get_full_name()} - Professional Profile"

    @property
    def total_certifications(self):
        """Get total number of certifications"""
        return self.certifications.count()

    @property
    def total_achievements(self):
        """Get total number of coach achievements"""
        return self.coach_achievements.count()

    @property
    def active_certifications(self):
        """Get certifications from the last 5 years (assuming they expire)"""
        from datetime import datetime
        current_year = datetime.now().year
        return self.certifications.filter(year__gte=current_year - 4)


class Achievement(models.Model):
    """Achievements for athletes"""
    
    CATEGORY_CHOICES = [
        ('race_achievement', 'Race Achievement'),
        ('personal_record', 'Personal Record'),
        ('competition_results', 'Competition Results'),
        ('training_milestone', 'Training Milestone'),
        ('other', 'Other'),
    ]
    
    profile = models.ForeignKey(
        AthleticProfile,
        on_delete=models.CASCADE,
        related_name='achievements'
    )
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        help_text='Type of achievement'
    )
    year = models.PositiveIntegerField(
        help_text='Year the achievement was earned'
    )
    title = models.CharField(
        max_length=200,
        help_text='Title of the achievement'
    )
    description = models.TextField(
        blank=True,
        help_text='Detailed description of the achievement (optional)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Achievement'
        verbose_name_plural = 'Achievements'
        ordering = ['-year', '-created_at']
        indexes = [
            models.Index(fields=['profile']),
            models.Index(fields=['category']),
            models.Index(fields=['year']),
        ]

    def clean(self):
        super().clean()
        from datetime import datetime
        current_year = datetime.now().year
        
        if self.year > current_year:
            raise ValidationError('Achievement year cannot be in the future.')
        
        if self.year < 1900:
            raise ValidationError('Achievement year must be after 1900.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.year}) - {self.profile.user.get_full_name()}"


class Certification(models.Model):
    """Certifications for coaches"""
    
    SPORT_CHOICES = [
        ('running', 'Running'),
        ('cycling', 'Cycling'),
        ('swimming', 'Swimming'),
        ('triathlon', 'Triathlon'),
        ('other', 'Other'),
    ]
    
    profile = models.ForeignKey(
        ProfessionalProfile,
        on_delete=models.CASCADE,
        related_name='certifications'
    )
    sport = models.CharField(
        max_length=50,
        choices=SPORT_CHOICES,
        help_text='Sport the certification is for'
    )
    year = models.PositiveIntegerField(
        help_text='Year the certification was obtained'
    )
    title = models.CharField(
        max_length=200,
        help_text='Title of the certification'
    )
    issuing_organization = models.CharField(
        max_length=200,
        blank=True,
        help_text='Organization that issued the certification (optional)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Certification'
        verbose_name_plural = 'Certifications'
        ordering = ['-year', '-created_at']
        indexes = [
            models.Index(fields=['profile']),
            models.Index(fields=['sport']),
            models.Index(fields=['year']),
            models.Index(fields=['issuing_organization']),
        ]

    def clean(self):
        super().clean()
        from datetime import datetime
        current_year = datetime.now().year
        
        if self.year > current_year:
            raise ValidationError('Certification year cannot be in the future.')
        
        if self.year < 1900:
            raise ValidationError('Certification year must be after 1900.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        if self.issuing_organization:
            return f"{self.title} - {self.issuing_organization} ({self.year})"
        return f"{self.title} ({self.year})"

    @property
    def is_recent(self):
        """Check if certification is from the last 5 years"""
        from datetime import datetime
        current_year = datetime.now().year
        return self.year >= (current_year - 4)


class CoachAchievement(models.Model):
    """Achievements for coaches"""
    
    CATEGORY_CHOICES = [
        ('race_achievement', 'Race Achievement'),
        ('personal_record', 'Personal Record'),
        ('competition_results', 'Competition Results'),
        ('training_milestone', 'Training Milestone'),
        ('other', 'Other'),
    ]
    
    profile = models.ForeignKey(
        ProfessionalProfile,
        on_delete=models.CASCADE,
        related_name='coach_achievements'
    )
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        help_text='Type of achievement'
    )
    year = models.PositiveIntegerField(
        help_text='Year the achievement was earned'
    )
    title = models.CharField(
        max_length=200,
        help_text='Title of the achievement'
    )
    description = models.TextField(
        blank=True,
        help_text='Detailed description of the achievement (optional)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Coach Achievement'
        verbose_name_plural = 'Coach Achievements'
        ordering = ['-year', '-created_at']
        indexes = [
            models.Index(fields=['profile']),
            models.Index(fields=['category']),
            models.Index(fields=['year']),
        ]

    def clean(self):
        super().clean()
        from datetime import datetime
        current_year = datetime.now().year
        
        if self.year > current_year:
            raise ValidationError('Achievement year cannot be in the future.')
        
        if self.year < 1900:
            raise ValidationError('Achievement year must be after 1900.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.year}) - {self.profile.user.get_full_name()}"


class CoachAssignment(models.Model):
    """
    Model to handle multiple coach-athlete relationships.
    Allows a user to have multiple coaches/mentors and be a coach to multiple users.
    """
    mentee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="coach_assignments",
        help_text="User being coached/mentored"
    )
    coach = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="mentee_assignments", 
        help_text="User providing coaching/mentoring"
    )
    # No relationship types needed - keep it simple
    start_date = models.DateField(
        auto_now_add=True,
        help_text="When this coaching relationship started"
    )
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="When this coaching relationship ended (if applicable)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this coaching relationship is currently active"
    )
    notes = models.TextField(
        blank=True,
        help_text="Additional notes about this coaching relationship"
    )
    
    # System fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_coach_assignment"
        verbose_name = "Coach Assignment"
        verbose_name_plural = "Coach Assignments"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["mentee"]),
            models.Index(fields=["coach"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["start_date"]),
        ]
        # Prevent duplicate active assignments
        constraints = [
            models.UniqueConstraint(
                fields=["mentee", "coach"],
                condition=models.Q(is_active=True),
                name="unique_active_coach_assignment"
            )
        ]

    def clean(self):
        super().clean()
        
        # Prevent self-assignment
        if self.mentee == self.coach:
            raise ValidationError("A user cannot be assigned as their own coach.")
            
        # Validate date ranges
        if self.end_date and self.end_date <= self.start_date:
            raise ValidationError("End date must be after start date.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        status = "Active" if self.is_active else "Inactive"
        return f"{self.coach.get_full_name()} can access {self.mentee.get_full_name()}'s calendar [{status}]"


# Signals to auto-create both profile types for all users
@receiver(post_save, sender=User)
def create_user_profiles(sender, instance, created, **kwargs):
    """
    Automatically create both Athletic and Professional profiles for all users.
    Role only determines which UI view is shown, not which data exists.
    """
    if created:
        # Create Athletic Profile
        AthleticProfile.objects.get_or_create(
            user=instance,
            defaults={
                'experience_years': 0,
                'about_notes': '',
                'sports_involved': []
            }
        )
        
        # Create Professional Profile  
        ProfessionalProfile.objects.get_or_create(
            user=instance,
            defaults={
                'experience_years': None,
                'about_notes': '',
            }
        )
