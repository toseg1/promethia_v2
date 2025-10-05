"""Event models for the sports training application"""
import json
import re
from datetime import datetime, time, timedelta
from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()


class EventManager(models.Manager):
    """Custom manager for Event model"""
    
    def upcoming_events(self, user=None):
        """Get upcoming events"""
        from django.utils import timezone
        queryset = self.filter(date__gte=timezone.now())
        if user:
            queryset = queryset.filter(athlete=user)
        return queryset.order_by('date')
    
    def past_events(self, user=None):
        """Get past events"""
        from django.utils import timezone
        queryset = self.filter(date__lt=timezone.now())
        if user:
            queryset = queryset.filter(athlete=user)
        return queryset.order_by('-date')
    
    def events_in_range(self, start_date, end_date, user=None):
        """Get events within a date range"""
        queryset = self.filter(date__range=[start_date, end_date])
        if user:
            queryset = queryset.filter(athlete=user)
        return queryset.order_by('date')


class Event(models.Model):
    """Abstract base model for all event types"""
    
    title = models.CharField(
        max_length=200,
        help_text='Title of the event'
    )
    athlete = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'athlete'},
        related_name='%(class)s_events',
        help_text='Athlete this event belongs to'
    )
    date = models.DateTimeField(
        help_text='Date and time of the event'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = EventManager()

    class Meta:
        abstract = True
        ordering = ['-date']
        indexes = [
            models.Index(fields=['athlete']),
            models.Index(fields=['date']),
        ]

    def clean(self):
        super().clean()
        if self.athlete and self.athlete.user_type != 'athlete':
            raise ValidationError('Events can only be assigned to athletes.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} - {self.athlete.get_full_name()} ({self.date.strftime('%Y-%m-%d')})"

    @property
    def is_upcoming(self):
        """Check if event is upcoming"""
        from django.utils import timezone
        return self.date > timezone.now()

    @property
    def is_today(self):
        """Check if event is today"""
        from django.utils import timezone
        return self.date.date() == timezone.now().date()


class TrainingManager(EventManager):
    """Custom manager for Training model"""
    
    def by_sport(self, sport):
        """Get training sessions by sport"""
        return self.filter(sport=sport)
    
    def this_week(self, user=None):
        """Get training sessions for this week"""
        from datetime import timedelta
        from django.utils import timezone
        today = timezone.now().date()
        start_week = today - timedelta(days=today.weekday())
        end_week = start_week + timedelta(days=6)
        
        queryset = self.filter(date__date__range=[start_week, end_week])
        if user:
            queryset = queryset.filter(athlete=user)
        return queryset.order_by('date')
    
    def total_duration_by_sport(self, user, sport=None):
        """Calculate total training duration by sport"""
        queryset = self.filter(athlete=user)
        if sport:
            queryset = queryset.filter(sport=sport)
        
        total = timedelta()
        for training in queryset:
            if training.duration:  # Now safely handles None values
                total += training.duration
        return total


class Training(Event):
    """Training session model"""
    
    SPORT_CHOICES = [
        ('running', 'Running'),
        ('cycling', 'Cycling'),
        ('swimming', 'Swimming'),
        ('strength', 'Strength'),
        ('other', 'Other'),
    ]
    
    TIME_UNITS = ['seconds', 'minutes', 'hours']
    DISTANCE_UNITS = ['meters', 'kilometers', 'miles']
    ZONE_TYPES = ['HR', 'MAS', 'FPP', 'CSS']  # Heart Rate, Maximum Aerobic Speed, Functional Power Profile, Critical Swim Speed
    
    duration = models.DurationField(
        null=True,
        blank=True,
        help_text='Duration of the training session (optional)'
    )
    time = models.TimeField(
        null=True,
        blank=True,
        help_text='Time of the training session (optional)'
    )
    sport = models.CharField(
        max_length=50,
        choices=SPORT_CHOICES,
        help_text='Sport type for this training'
    )
    training_data = models.JSONField(
        default=dict,
        blank=True,
        help_text='Complex nested structure for workout builder (optional)'
    )
    notes = models.TextField(
        blank=True,
        help_text='Additional notes about the training'
    )
    
    objects = TrainingManager()

    class Meta:
        verbose_name = 'Training Session'
        verbose_name_plural = 'Training Sessions'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['athlete', 'sport']),
            models.Index(fields=['sport']),
            models.Index(fields=['date']),
        ]

    def clean(self):
        super().clean()
        
        # Validate training data structure
        if self.training_data:
            self._validate_training_data()

    def _validate_training_data(self):
        """Validate the complex training data JSON structure"""
        data = self.training_data

        print(f"\n🔍 VALIDATING training_data:")
        print(f"  Full data: {json.dumps(data, indent=2)}")

        # Validate warmup
        if 'warmup' in data:
            self._validate_phase(data['warmup'], 'warmup')

        # Validate intervals
        if 'intervals' in data:
            print(f"  📊 Found {len(data['intervals'])} intervals to validate")
            if not isinstance(data['intervals'], list):
                raise ValidationError('Intervals must be a list.')
            
            for i, interval in enumerate(data['intervals']):
                print(f"    Interval {i}: {json.dumps(interval, indent=4)}")
                self._validate_interval(interval, f'intervals[{i}]')
        
        # Validate rest periods
        if 'rest_periods' in data:
            if not isinstance(data['rest_periods'], list):
                raise ValidationError('Rest periods must be a list.')
            
            for i, rest in enumerate(data['rest_periods']):
                self._validate_phase(rest, f'rest_periods[{i}]')
        
        # Validate cooldown
        if 'cooldown' in data:
            self._validate_phase(data['cooldown'], 'cooldown')

    def _validate_phase(self, phase, phase_name):
        """Validate a training phase (warmup, cooldown, etc.)"""
        # Name is always required
        if 'name' not in phase:
            raise ValidationError(f'{phase_name} must have name.')
        
        # Duration and unit are optional for warmup/cooldown, but if one exists, both must exist
        has_duration = 'duration' in phase
        has_unit = 'unit' in phase
        
        if has_duration and not has_unit:
            raise ValidationError(f'{phase_name} must have unit when duration is specified.')
        elif has_unit and not has_duration:
            raise ValidationError(f'{phase_name} must have duration when unit is specified.')
        
        # Validate unit consistency if present
        if has_unit:
            if phase.get('unit') not in self.TIME_UNITS + self.DISTANCE_UNITS:
                raise ValidationError(f'{phase_name} unit must be one of: {self.TIME_UNITS + self.DISTANCE_UNITS}')
        
        # Validate zone_type if present
        if 'zone_type' in phase:
            self._validate_zone_type(phase['zone_type'], phase_name)
        
        # Validate intensity if present
        if 'intensity' in phase:
            self._validate_intensity(phase['intensity'], phase_name)

    def _validate_interval(self, interval, interval_name):
        """Validate an interval structure"""
        # Name is always required
        if 'name' not in interval:
            raise ValidationError(f'{interval_name} must have name.')
        
        has_sub_intervals = 'sub_intervals' in interval
        
        if has_sub_intervals:
            # When sub-intervals exist, only name, repetitions, and sub_intervals are allowed
            if not isinstance(interval['sub_intervals'], list):
                raise ValidationError(f'{interval_name} sub_intervals must be a list.')

            if len(interval['sub_intervals']) == 0:
                raise ValidationError(
                    f'{interval_name} has sub_intervals but the array is empty. '
                    f'Either add work/rest phases to sub_intervals, or remove the sub_intervals field to create a simple interval.'
                )

            # Validate repetitions field for intervals with sub-intervals
            if 'repetitions' not in interval:
                raise ValidationError(
                    f'{interval_name} must have repetitions when sub_intervals are specified. '
                    f'The repetitions field defines how many times to repeat the entire work+rest sequence.'
                )

            if not isinstance(interval['repetitions'], int) or interval['repetitions'] <= 0:
                raise ValidationError(
                    f'{interval_name} repetitions must be a positive integer (got: {interval.get("repetitions")}).'
                )

            # Check for unexpected parent-level fields that conflict with sub-intervals
            forbidden_fields = []
            for field in ['type', 'duration_or_distance', 'unit']:
                if field in interval:
                    forbidden_fields.append(field)

            if forbidden_fields:
                raise ValidationError(
                    f'{interval_name} has sub_intervals but also contains parent-level fields: {forbidden_fields}. '
                    f'When an interval has sub_intervals, it acts as a "repeat set". '
                    f'Only "name", "repetitions", and "sub_intervals" should be present. '
                    f'Duration, distance, and intensity should be defined in the sub_intervals themselves.'
                )

            # Validate each sub-interval
            for i, sub_interval in enumerate(interval['sub_intervals']):
                self._validate_sub_interval(sub_interval, f'{interval_name}.sub_intervals[{i}]')
        else:
            # When no sub-intervals, type, duration_or_distance, and unit are required
            required_fields = ['type', 'duration_or_distance', 'unit']
            for field in required_fields:
                if field not in interval:
                    raise ValidationError(f'{interval_name} must have {field} when sub_intervals are not specified.')
            
            # Validate unit consistency
            if interval.get('unit') not in self.TIME_UNITS + self.DISTANCE_UNITS:
                raise ValidationError(f'{interval_name} unit must be one of: {self.TIME_UNITS + self.DISTANCE_UNITS}')
            
            # Validate type and unit consistency
            interval_type = interval.get('type')
            unit = interval.get('unit')
            
            if interval_type == 'time' and unit not in self.TIME_UNITS:
                raise ValidationError(f'{interval_name} with type "time" must use time units: {self.TIME_UNITS}')
            
            if interval_type == 'distance' and unit not in self.DISTANCE_UNITS:
                raise ValidationError(f'{interval_name} with type "distance" must use distance units: {self.DISTANCE_UNITS}')
        
        # Validate optional fields if present
        if 'zone_type' in interval:
            self._validate_zone_type(interval['zone_type'], interval_name)
        
        if 'intensity' in interval:
            self._validate_intensity(interval['intensity'], interval_name)

    def _validate_sub_interval(self, sub_interval, sub_interval_name):
        """Validate a sub-interval structure"""
        if 'work' in sub_interval:
            self._validate_work_rest_phase(sub_interval['work'], f'{sub_interval_name}.work')
        
        if 'rest' in sub_interval:
            self._validate_work_rest_phase(sub_interval['rest'], f'{sub_interval_name}.rest')

    def _validate_work_rest_phase(self, phase, phase_name):
        """Validate work or rest phase in sub-intervals"""
        required_fields = ['name', 'duration', 'unit'] if 'rest' in phase_name else ['name', 'type', 'duration_or_distance', 'unit']
        
        for field in required_fields:
            if field not in phase:
                raise ValidationError(f'{phase_name} must have {field}.')
        
        # For work phases, validate type and unit consistency
        if 'work' in phase_name:
            phase_type = phase.get('type')
            unit = phase.get('unit')
            
            if phase_type == 'time' and unit not in self.TIME_UNITS:
                raise ValidationError(f'{phase_name} with type "time" must use time units: {self.TIME_UNITS}')
            
            if phase_type == 'distance' and unit not in self.DISTANCE_UNITS:
                raise ValidationError(f'{phase_name} with type "distance" must use distance units: {self.DISTANCE_UNITS}')
        
        # Validate optional fields if present
        if 'zone_type' in phase:
            self._validate_zone_type(phase['zone_type'], phase_name)
        
        if 'intensity' in phase:
            self._validate_intensity(phase['intensity'], phase_name)

    def _validate_zone_type(self, zone_type, context_name):
        """Validate zone type field"""
        if zone_type not in self.ZONE_TYPES:
            raise ValidationError(
                f'{context_name} zone_type must be one of: {self.ZONE_TYPES}. '
                f'HR=Heart Rate, MAS=Maximum Aerobic Speed, FPP=Functional Power Profile, CSS=Critical Swim Speed'
            )

    def _validate_intensity(self, intensity, context_name):
        """Validate intensity field (percentage value)"""
        if not isinstance(intensity, (int, float)):
            raise ValidationError(f'{context_name} intensity must be a number.')
        
        if intensity < 0 or intensity > 150:
            raise ValidationError(f'{context_name} intensity must be between 0 and 150 percent.')

    def __str__(self):
        return f"Training: {self.title} - {self.sport} ({self.date.strftime('%Y-%m-%d %H:%M')})"

    @property
    def workout_summary(self):
        """Generate a summary of the workout structure"""
        if not self.training_data:
            return "No workout data"
        
        summary_parts = []
        
        if 'warmup' in self.training_data:
            warmup = self.training_data['warmup']
            summary_parts.append(f"Warmup: {warmup.get('duration', 0)} {warmup.get('unit', '')}")
        
        if 'intervals' in self.training_data:
            interval_count = len(self.training_data['intervals'])
            summary_parts.append(f"Intervals: {interval_count} sets")
        
        if 'cooldown' in self.training_data:
            cooldown = self.training_data['cooldown']
            summary_parts.append(f"Cooldown: {cooldown.get('duration', 0)} {cooldown.get('unit', '')}")
        
        return " | ".join(summary_parts) if summary_parts else "Basic training"


class RaceManager(EventManager):
    """Custom manager for Race model"""
    
    def by_sport(self, sport):
        """Get races by sport"""
        return self.filter(sport=sport)
    
    def completed_races(self, user=None):
        """Get completed races (with finish times)"""
        queryset = self.filter(finish_time__isnull=False)
        if user:
            queryset = queryset.filter(athlete=user)
        return queryset.order_by('-date')
    
    def upcoming_races(self, user=None):
        """Get upcoming races"""
        from django.utils import timezone
        queryset = self.filter(date__gte=timezone.now())
        if user:
            queryset = queryset.filter(athlete=user)
        return queryset.order_by('date')


class Race(Event):
    """Race event model"""
    
    SPORT_CHOICES = [
        ('running', 'Running'),
        ('cycling', 'Cycling'),
        ('swimming', 'Swimming'),
        ('triathlon', 'Triathlon'),
        ('other', 'Other'),
    ]
    
    sport = models.CharField(
        max_length=50,
        choices=SPORT_CHOICES,
        help_text='Sport type for this race'
    )
    location = models.CharField(
        max_length=200,
        blank=True,
        help_text='Race location (optional)'
    )
    distance = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Race distance description (optional)'
    )
    description = models.TextField(
        null=True,
        blank=True,
        help_text='Additional race details (optional)'
    )
    finish_time = models.DurationField(
        null=True,
        blank=True,
        help_text='Actual finish time (leave blank if not completed)'
    )
    target_time = models.DurationField(
        null=True,
        blank=True,
        help_text='Target finish time'
    )
    
    objects = RaceManager()

    class Meta:
        verbose_name = 'Race'
        verbose_name_plural = 'Races'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['athlete', 'sport']),
            models.Index(fields=['sport']),
            models.Index(fields=['date']),
            models.Index(fields=['location']),
        ]

    def clean(self):
        super().clean()
        
        if self.distance:
            cleaned_distance = str(self.distance).strip()
            self.distance = cleaned_distance or None
        
        if self.finish_time and self.target_time and self.finish_time > self.target_time * 2:
            raise ValidationError('Finish time seems unreasonably slow compared to target time.')

    def __str__(self):
        distance_str = f"{self.distance} " if self.distance else ""
        location_str = f" at {self.location}" if self.location else ""
        return f"Race: {self.title} - {distance_str}{self.sport}{location_str}"

    @staticmethod
    def parse_distance_to_km(distance_str):
        """Attempt to parse a distance string into kilometers."""
        if not distance_str:
            return None

        text = str(distance_str).strip().lower()
        if not text:
            return None

        match = re.search(r"(\d+(?:\.\d+)?)(?:\s?(km|k|mi|mile|m))?", text)
        if not match:
            return None

        value = float(match.group(1))
        unit = match.group(2)

        if value <= 0:
            return None

        if unit in {'mi', 'mile'} or 'mile' in text:
            return value * 1.60934

        if unit == 'm':
            return value / 1000

        if unit == 'k':
            return value

        if unit == 'km' or 'km' in text:
            return value

        return value

    @property
    def is_completed(self):
        """Check if race is completed"""
        return self.finish_time is not None

    @property
    def pace_per_km(self):
        """Calculate pace per kilometer (only for completed races)"""
        if not self.is_completed or not self.distance:
            return None
        
        distance_km = self.parse_distance_to_km(self.distance)
        if not distance_km:
            return None

        total_seconds = self.finish_time.total_seconds()
        pace_seconds = total_seconds / distance_km

        minutes = int(pace_seconds // 60)
        seconds = int(pace_seconds % 60)

        return f"{minutes}:{seconds:02d}/km"

    @property
    def target_vs_actual(self):
        """Compare target time vs actual time"""
        if not self.is_completed or not self.target_time:
            return None
        
        difference = self.finish_time - self.target_time
        
        if difference.total_seconds() > 0:
            return f"+{difference} (slower)"
        else:
            return f"{abs(difference)} (faster)"


class CustomEventManager(models.Manager):
    """Custom manager for CustomEvent model"""
    
    def by_color(self, color):
        """Get events by color"""
        return self.filter(event_color=color)
    
    def multi_day_events(self):
        """Get events that span multiple days"""
        from django.db.models import F
        return self.exclude(date_end__date=F('date__date'))


class CustomEvent(Event):
    """Custom event model for flexible events"""
    
    COLOR_CHOICES = [
        ('red', 'Red'),
        ('blue', 'Blue'),
        ('green', 'Green'),
        ('yellow', 'Yellow'),
        ('purple', 'Purple'),
        ('orange', 'Orange'),
    ]
    
    date_end = models.DateTimeField(
        null=True,
        blank=True,
        help_text='End date and time of the event (optional)'
    )
    location = models.CharField(
        max_length=200,
        blank=True,
        help_text='Event location (optional)'
    )
    event_color = models.CharField(
        max_length=20,
        choices=COLOR_CHOICES,
        default='blue',
        help_text='Color for calendar display'
    )
    description = models.TextField(
        blank=True,
        help_text='Event description'
    )
    
    objects = CustomEventManager()

    class Meta:
        verbose_name = 'Custom Event'
        verbose_name_plural = 'Custom Events'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['athlete', 'event_color']),
            models.Index(fields=['date', 'date_end']),
            models.Index(fields=['event_color']),
        ]

    def clean(self):
        super().clean()
        
        if self.date_end and self.date_end < self.date:
            raise ValidationError('End date must be on or after start date.')

    def __str__(self):
        start = self.date.strftime('%Y-%m-%d') if self.date else 'unknown'
        if self.date_end:
            end = self.date_end.strftime('%Y-%m-%d')
        else:
            end = start
        return f"Custom Event: {self.title} ({start} to {end})"

    @property
    def duration_days(self):
        """Calculate event duration in days"""
        if not self.date_end:
            return 1
        
        delta = self.date_end.date() - self.date.date()
        return delta.days + 1

    @property
    def is_multi_day(self):
        """Check if event spans multiple days"""
        return self.duration_days > 1


class SavedTraining(models.Model):
    """User's saved training builders that can be reused as templates"""

    # Ownership
    creator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='saved_trainings',
        help_text='User who created this training template (coach or athlete)'
    )

    # Training details
    name = models.CharField(max_length=255, help_text='Name of the training')
    sport = models.CharField(
        max_length=50,
        choices=Training.SPORT_CHOICES,
        help_text='Sport type for this training'
    )
    description = models.TextField(blank=True, help_text='Optional description')

    # Training structure (same as Training.training_data)
    training_data = models.JSONField(
        default=dict,
        blank=True,
        help_text='Training builder structure (warmup, intervals, cooldown, etc.)'
    )

    # Metadata
    is_public = models.BooleanField(
        default=False,
        help_text='Whether this training is visible to other users (future feature)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['creator', 'sport']),
            models.Index(fields=['sport', 'is_public']),
        ]
        verbose_name = 'Saved Training'
        verbose_name_plural = 'Saved Trainings'

    def __str__(self):
        return f"{self.name} ({self.sport}) - {self.creator.get_full_name()}"
