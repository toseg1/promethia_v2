from rest_framework import serializers
from datetime import datetime, timedelta
from typing import Optional
from django.utils import timezone

from accounts.models import User

from .events import Training, Race, CustomEvent
from .event_normalization import NormalizedEventPayload, normalize_event_payload


class TrainingDataValidator:
    """Custom validator for training data JSON structure"""
    
    VALID_ZONE_TYPES = ['HR', 'MAS', 'FPP', 'CSS']
    VALID_UNITS = ['minutes', 'seconds', 'kilometers', 'meters']
    VALID_INTERVAL_TYPES = ['time', 'distance']
    
    @classmethod
    def validate_training_data(cls, data):
        """Validate the complete training data structure"""
        if not isinstance(data, dict):
            raise serializers.ValidationError('Training data must be a JSON object.')
        
        errors = []
        
        # Validate warmup
        if 'warmup' in data:
            warmup_errors = cls._validate_phase(data['warmup'], 'warmup')
            if warmup_errors:
                errors.extend([f"warmup.{error}" for error in warmup_errors])
        
        # Validate intervals
        if 'intervals' in data and isinstance(data['intervals'], list):
            for i, interval in enumerate(data['intervals']):
                interval_errors = cls._validate_interval(interval, f'intervals[{i}]')
                if interval_errors:
                    errors.extend([f"intervals[{i}].{error}" for error in interval_errors])
        
        # Validate rest periods
        if 'rest_periods' in data and isinstance(data['rest_periods'], list):
            for i, rest in enumerate(data['rest_periods']):
                rest_errors = cls._validate_rest(rest, f'rest_periods[{i}]')
                if rest_errors:
                    errors.extend([f"rest_periods[{i}].{error}" for error in rest_errors])
        
        # Validate cooldown
        if 'cooldown' in data:
            cooldown_errors = cls._validate_phase(data['cooldown'], 'cooldown')
            if cooldown_errors:
                errors.extend([f"cooldown.{error}" for error in cooldown_errors])
        
        if errors:
            raise serializers.ValidationError(f"Training data validation errors: {'; '.join(errors)}")
        
        return data
    
    @classmethod
    def _validate_phase(cls, phase, phase_name):
        """Validate warmup/cooldown phases"""
        errors = []
        
        if not isinstance(phase, dict):
            return [f'{phase_name} must be an object']
        
        # Required fields
        if 'name' not in phase:
            errors.append('name is required')
        if 'duration' not in phase:
            errors.append('duration is required')
        
        # Validate duration
        if 'duration' in phase:
            if not isinstance(phase['duration'], (int, float)) or phase['duration'] <= 0:
                errors.append('duration must be a positive number')
        
        # Validate unit
        if 'unit' in phase and phase['unit'] not in cls.VALID_UNITS:
            errors.append(f'unit must be one of: {", ".join(cls.VALID_UNITS)}')
        
        # Validate zone type and intensity
        if 'zone_type' in phase and phase['zone_type'] not in cls.VALID_ZONE_TYPES:
            errors.append(f'zone_type must be one of: {", ".join(cls.VALID_ZONE_TYPES)}')
        
        if 'intensity' in phase:
            if not isinstance(phase['intensity'], (int, float)) or not (0 <= phase['intensity'] <= 100):
                errors.append('intensity must be a number between 0 and 100')
        
        return errors
    
    @classmethod
    def _validate_interval(cls, interval, interval_name):
        """Validate interval structure"""
        errors = []

        if not isinstance(interval, dict):
            return [f'{interval_name} must be an object']

        # Name is always required
        if 'name' not in interval:
            errors.append('name is required')

        has_sub_intervals = 'sub_intervals' in interval

        if has_sub_intervals:
            # Complex interval with sub-intervals
            # Only name, repetitions, and sub_intervals are required
            if not isinstance(interval['sub_intervals'], list):
                errors.append('sub_intervals must be a list')
            elif len(interval['sub_intervals']) == 0:
                errors.append('sub_intervals array is empty - either add work/rest phases or remove sub_intervals field')

            if 'repetitions' not in interval:
                errors.append('repetitions is required when sub_intervals are specified')
            elif not isinstance(interval['repetitions'], int) or interval['repetitions'] <= 0:
                errors.append('repetitions must be a positive integer')

            # Check for forbidden parent-level fields
            forbidden_fields = []
            for field in ['type', 'duration_or_distance', 'unit']:
                if field in interval:
                    forbidden_fields.append(field)

            if forbidden_fields:
                errors.append(f'has sub_intervals but also contains parent-level fields: {forbidden_fields}. Only name, repetitions, and sub_intervals should be present.')

            # Validate each sub-interval
            if isinstance(interval.get('sub_intervals'), list):
                for i, sub_interval in enumerate(interval['sub_intervals']):
                    sub_errors = cls._validate_sub_interval(sub_interval, f'{interval_name}.sub_intervals[{i}]')
                    if sub_errors:
                        errors.extend([f"sub_intervals[{i}].{error}" for error in sub_errors])
        else:
            # Simple interval without sub-intervals
            # type, duration_or_distance, unit, and repetitions are required
            required_fields = ['type', 'duration_or_distance', 'unit', 'repetitions']
            for field in required_fields:
                if field not in interval:
                    errors.append(f'{field} is required')

            # Validate type
            if 'type' in interval and interval['type'] not in cls.VALID_INTERVAL_TYPES:
                errors.append(f'type must be one of: {", ".join(cls.VALID_INTERVAL_TYPES)}')

            # Validate duration_or_distance
            if 'duration_or_distance' in interval:
                if not isinstance(interval['duration_or_distance'], (int, float)) or interval['duration_or_distance'] <= 0:
                    errors.append('duration_or_distance must be a positive number')

            # Validate repetitions
            if 'repetitions' in interval:
                if not isinstance(interval['repetitions'], int) or interval['repetitions'] <= 0:
                    errors.append('repetitions must be a positive integer')

        return errors
    
    @classmethod
    def _validate_sub_interval(cls, sub_interval, sub_interval_name):
        """Validate sub-interval structure"""
        errors = []
        
        if not isinstance(sub_interval, dict):
            return [f'{sub_interval_name} must be an object']
        
        # Validate work phase
        if 'work' in sub_interval:
            work_errors = cls._validate_work_phase(sub_interval['work'])
            if work_errors:
                errors.extend([f"work.{error}" for error in work_errors])
        
        # Validate rest phase
        if 'rest' in sub_interval:
            rest_errors = cls._validate_rest(sub_interval['rest'], 'rest')
            if rest_errors:
                errors.extend([f"rest.{error}" for error in rest_errors])
        
        return errors
    
    @classmethod
    def _validate_work_phase(cls, work):
        """Validate work phase in sub-intervals"""
        errors = []
        
        if not isinstance(work, dict):
            return ['work must be an object']
        
        # Required fields
        required_fields = ['name', 'type', 'duration_or_distance']
        for field in required_fields:
            if field not in work:
                errors.append(f'{field} is required')
        
        # Validate type
        if 'type' in work and work['type'] not in cls.VALID_INTERVAL_TYPES:
            errors.append(f'type must be one of: {", ".join(cls.VALID_INTERVAL_TYPES)}')
        
        # Validate duration_or_distance
        if 'duration_or_distance' in work:
            if not isinstance(work['duration_or_distance'], (int, float)) or work['duration_or_distance'] <= 0:
                errors.append('duration_or_distance must be a positive number')
        
        return errors
    
    @classmethod
    def _validate_rest(cls, rest, rest_name):
        """Validate rest periods"""
        errors = []
        
        if not isinstance(rest, dict):
            return [f'{rest_name} must be an object']
        
        # Required fields
        if 'duration' not in rest:
            errors.append('duration is required')
        
        # Validate duration
        if 'duration' in rest:
            if not isinstance(rest['duration'], (int, float)) or rest['duration'] <= 0:
                errors.append('duration must be a positive number')
        
        # Validate unit
        if 'unit' in rest and rest['unit'] not in cls.VALID_UNITS:
            errors.append(f'unit must be one of: {", ".join(cls.VALID_UNITS)}')
        
        return errors


# Event Serializers
class TrainingSerializer(serializers.ModelSerializer):
    """Full training serializer with complex training_data validation"""
    
    athlete_name = serializers.CharField(source='athlete.get_full_name', read_only=True)
    workout_summary = serializers.ReadOnlyField()
    is_upcoming = serializers.ReadOnlyField()
    is_today = serializers.ReadOnlyField()
    
    class Meta:
        model = Training
        fields = [
            'id', 'title', 'athlete', 'athlete_name', 'date', 'duration', 'time',
            'sport', 'training_data', 'notes', 'workout_summary', 'is_upcoming',
            'is_today', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'athlete_name', 'workout_summary', 'is_upcoming', 'is_today',
            'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'athlete': {'required': False}  # Make athlete optional in serializer
        }

    def validate_training_data(self, value):
        """Validate training data structure"""
        if value:
            return TrainingDataValidator.validate_training_data(value)
        return value

    def validate_date(self, value):
        """Validate training date"""
        if value and value.date() < (timezone.now() - timedelta(days=365)).date():
            raise serializers.ValidationError('Training date cannot be more than 1 year in the past.')
        return value


class TrainingListSerializer(serializers.ModelSerializer):
    """Simplified training serializer for calendar/list views"""
    
    athlete_name = serializers.CharField(source='athlete.get_full_name', read_only=True)
    is_upcoming = serializers.ReadOnlyField()
    is_today = serializers.ReadOnlyField()
    
    class Meta:
        model = Training
        fields = [
            'id', 'title', 'athlete', 'athlete_name', 'date', 'time', 'sport',
            'duration', 'is_upcoming', 'is_today'
        ]


class RaceSerializer(serializers.ModelSerializer):
    """Full race serializer with performance tracking"""
    
    athlete_name = serializers.CharField(source='athlete.get_full_name', read_only=True)
    is_upcoming = serializers.ReadOnlyField()
    is_today = serializers.ReadOnlyField()
    is_completed = serializers.ReadOnlyField()
    pace_per_km = serializers.ReadOnlyField()
    target_vs_actual = serializers.ReadOnlyField()
    
    class Meta:
        model = Race
        fields = [
            'id', 'title', 'athlete', 'athlete_name', 'date', 'sport', 'location',
            'distance', 'description', 'finish_time', 'target_time', 'is_upcoming', 'is_today',
            'is_completed', 'pace_per_km', 'target_vs_actual', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'athlete_name', 'is_upcoming', 'is_today', 'is_completed',
            'pace_per_km', 'target_vs_actual', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'athlete': {'required': False}  # Make athlete optional in serializer
        }

    def validate(self, attrs):
        """Validate race data"""
        distance = attrs.get('distance')
        finish_time = attrs.get('finish_time', getattr(self.instance, 'finish_time', None))
        target_time = attrs.get('target_time', getattr(self.instance, 'target_time', None))

        if distance is None and self.instance:
            distance = self.instance.distance

        # If distance and finish_time are provided, validate reasonable pace
        distance_km = Race.parse_distance_to_km(distance) if distance else None
        if distance_km and finish_time:
            # Convert finish_time to seconds for calculation
            total_seconds = finish_time.total_seconds()
            pace_per_km_seconds = total_seconds / distance_km
            
            # Reasonable pace validation (1 minute to 15 minutes per km)
            if pace_per_km_seconds < 60 or pace_per_km_seconds > 900:
                raise serializers.ValidationError(
                    'The combination of distance and finish time results in an unrealistic pace.'
                )
        
        # Validate target vs finish time
        if target_time and finish_time and target_time > finish_time:
            # This is actually good - they beat their target!
            pass

        return attrs


class CustomEventSerializer(serializers.ModelSerializer):
    """Serializer for custom events"""
    
    athlete_name = serializers.CharField(source='athlete.get_full_name', read_only=True)
    is_upcoming = serializers.ReadOnlyField()
    is_today = serializers.ReadOnlyField()
    duration_days = serializers.ReadOnlyField()
    is_multi_day = serializers.ReadOnlyField()
    
    class Meta:
        model = CustomEvent
        fields = [
            'id', 'title', 'athlete', 'athlete_name', 'date', 'date_end',
            'location', 'event_color', 'description', 'is_upcoming', 'is_today',
            'duration_days', 'is_multi_day', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'athlete_name', 'is_upcoming', 'is_today', 'duration_days',
            'is_multi_day', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'athlete': {'required': False},  # Make athlete optional in serializer
            'date_end': {'allow_null': True},
        }

    def validate(self, attrs):
        """Validate custom event dates"""
        date = attrs.get('date')
        date_end = attrs.get('date_end')
        
        if date and date_end and date_end <= date:
            raise serializers.ValidationError('End date must be after start date.')
        
        return attrs


class EventCalendarSerializer(serializers.Serializer):
    """Unified serializer for calendar view showing all event types"""

    id = serializers.IntegerField()
    title = serializers.CharField()
    date = serializers.DateTimeField()
    event_type = serializers.CharField()  # 'training', 'race', 'custom_event'
    sport = serializers.CharField(required=False)
    location = serializers.CharField(required=False)
    event_color = serializers.CharField(required=False)
    is_completed = serializers.BooleanField(required=False)
    athlete_name = serializers.CharField()
    distance = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)
    training_data = serializers.JSONField(required=False, allow_null=True)  # Added for training events

    class Meta:
        fields = [
            'id', 'title', 'date', 'event_type', 'sport', 'location',
            'event_color', 'is_completed', 'athlete_name', 'distance', 'description',
            'training_data'
        ]


# Training Duplication Serializer
class TrainingDuplicateSerializer(serializers.Serializer):
    """Serializer for duplicating training sessions"""
    
    new_date = serializers.DateTimeField()
    new_title = serializers.CharField(required=False, allow_blank=True)
    
    def validate_new_date(self, value):
        """Validate the new training date"""
        if value.date() < timezone.now().date():
            raise serializers.ValidationError('New training date cannot be in the past.')
        return value


# Statistics Serializers
class TrainingStatsSerializer(serializers.Serializer):
    """Serializer for training statistics"""
    
    period = serializers.CharField()  # 'week', 'month', 'year'
    sport = serializers.CharField(required=False)
    total_sessions = serializers.IntegerField()
    total_duration = serializers.DurationField()
    average_duration = serializers.DurationField()
    sports_breakdown = serializers.DictField()
    
    class Meta:
        fields = [
            'period', 'sport', 'total_sessions', 'total_duration',
            'average_duration', 'sports_breakdown'
        ]


class RaceResultsSerializer(serializers.ModelSerializer):
    """Serializer for completed races with results"""
    
    athlete_name = serializers.CharField(source='athlete.get_full_name', read_only=True)
    pace_per_km = serializers.ReadOnlyField()
    target_vs_actual = serializers.ReadOnlyField()
    
    class Meta:
        model = Race
        fields = [
            'id', 'title', 'athlete', 'athlete_name', 'date', 'sport',
            'location', 'distance', 'finish_time', 'target_time',
            'pace_per_km', 'target_vs_actual'
        ]
        read_only_fields = [
            'id', 'athlete_name', 'pace_per_km', 'target_vs_actual'
        ]

    def to_representation(self, instance):
        """Only return completed races"""
        if not instance.is_completed:
            return None
        return super().to_representation(instance)


class EventCreateSerializer(serializers.Serializer):
    """Serializer that accepts unified calendar event payloads and persists models."""

    type = serializers.ChoiceField(choices=['training', 'race', 'custom'])
    title = serializers.CharField(required=False, allow_blank=True)
    date = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    dateStart = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    dateEnd = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    time = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    duration = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    sport = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    location = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    athlete = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    athleteId = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    trainingBlocks = serializers.ListField(child=serializers.DictField(), required=False)
    distance = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    timeObjective = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    customEventColor = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    normalized: NormalizedEventPayload | None = None

    SERIALIZER_LOOKUP = {
        'TrainingSerializer': TrainingSerializer,
        'RaceSerializer': RaceSerializer,
        'CustomEventSerializer': CustomEventSerializer,
    }

    def validate(self, attrs):
        try:
            normalized = normalize_event_payload(self.initial_data)
        except ValueError as exc:
            raise serializers.ValidationError({'type': str(exc)})

        errors = {}
        payload = normalized.payload

        if normalized.event_type == 'training':
            if not payload.get('date'):
                errors['date'] = 'Date is required for training events.'
            if not payload.get('sport'):
                errors['sport'] = 'Sport selection is required for training events.'
        elif normalized.event_type == 'race':
            if not payload.get('date'):
                errors['dateStart'] = 'Start date is required for race events.'
            if not payload.get('sport'):
                errors['sport'] = 'Sport selection is required for race events.'
        elif normalized.event_type == 'custom':
            if not payload.get('date'):
                errors['dateStart'] = 'Start date is required for custom events.'
            if payload.get('date_end') and payload['date'] and payload['date_end'] < payload['date']:
                errors['dateEnd'] = 'End date must be on or after start date.'

        if errors:
            raise serializers.ValidationError(errors)

        self.normalized = normalized
        return attrs

    def create(self, validated_data):
        if not self.normalized:
            raise serializers.ValidationError('Event payload could not be normalized.')

        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if user is None or not user.is_authenticated:
            raise serializers.ValidationError({'detail': 'Authentication required to create events.'})

        normalized = self.normalized
        serializer_class = self.SERIALIZER_LOOKUP[normalized.serializer_path]

        athlete = self._determine_athlete(user, normalized.athlete_id)

        model_serializer = serializer_class(data=normalized.payload, context=self.context)
        model_serializer.is_valid(raise_exception=True)
        instance = model_serializer.save(athlete=athlete)
        return instance

    def _determine_athlete(self, user: User, athlete_id: Optional[int]) -> User:
        """Resolve the athlete to assign the event to, respecting permissions."""

        if user.is_athlete():
            return user

        if user.is_coach():
            if not athlete_id:
                raise serializers.ValidationError({'athlete': 'Coach must specify athlete for this event.'})
            try:
                athlete = User.objects.get(id=athlete_id)
            except User.DoesNotExist as exc:
                raise serializers.ValidationError({'athlete': 'Specified athlete does not exist.'}) from exc

            assigned_athletes = User.objects.get_by_coach(user)
            if not assigned_athletes.filter(id=athlete.id).exists():
                raise serializers.ValidationError({'athlete': "You don't have permission to create events for this athlete."})
            return athlete

        raise serializers.ValidationError({'detail': 'Only athletes or coaches can create events.'})


# Saved Training Serializer
class SavedTrainingSerializer(serializers.ModelSerializer):
    """Serializer for saved training templates"""

    creator_name = serializers.CharField(source='creator.get_full_name', read_only=True)

    class Meta:
        from core.events import SavedTraining
        model = SavedTraining
        fields = [
            'id', 'name', 'sport', 'description', 'training_data',
            'creator', 'creator_name', 'is_public',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'creator', 'creator_name', 'created_at', 'updated_at']

    def validate_training_data(self, value):
        """Validate training data structure using existing validator"""
        if value:
            return TrainingDataValidator.validate_training_data(value)
        return value


# Dashboard Summary Serializer
class DashboardSummarySerializer(serializers.Serializer):
    """Serializer for user dashboard summary"""

    upcoming_trainings = TrainingListSerializer(many=True)
    upcoming_races = RaceSerializer(many=True)
    this_week_stats = serializers.DictField()
    recent_achievements = serializers.ListSerializer(child=serializers.DictField())
    coaching_summary = serializers.DictField()

    class Meta:
        fields = [
            'upcoming_trainings', 'upcoming_races', 'this_week_stats',
            'recent_achievements', 'coaching_summary'
        ]
