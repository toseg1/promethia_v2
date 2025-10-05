from rest_framework import viewsets, status, filters, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from collections import defaultdict

from .events import Training, Race, CustomEvent, SavedTraining
from .serializers import (
    TrainingSerializer, TrainingListSerializer, RaceSerializer, CustomEventSerializer,
    EventCalendarSerializer, TrainingDuplicateSerializer, TrainingStatsSerializer,
    RaceResultsSerializer, EventCreateSerializer, SavedTrainingSerializer
)
from .permissions import IsOwnerOrCoach, IsOwner
from .pagination import StandardResultsSetPagination, CalendarPagination
from accounts.models import User


class TrainingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for training sessions with full CRUD and custom actions.
    Athletes manage their own, coaches manage their athletes'.
    """
    
    queryset = Training.objects.all()
    permission_classes = [IsOwnerOrCoach]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sport', 'athlete']
    search_fields = ['title', 'notes']
    ordering_fields = ['date', 'created_at', 'sport']
    ordering = ['-date']

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action in ['list', 'calendar', 'upcoming', 'this_week']:
            return TrainingListSerializer
        elif self.action == 'duplicate':
            return TrainingDuplicateSerializer
        elif self.action == 'stats':
            return TrainingStatsSerializer
        return TrainingSerializer

    def get_queryset(self):
        """Filter queryset based on user permissions and query parameters"""
        user = self.request.user
        queryset = Training.objects.select_related('athlete')
        
        if not user.is_authenticated:
            return Training.objects.none()
            
        if user.is_athlete():
            # Athletes see only their own training
            queryset = queryset.filter(athlete=user)
        elif user.is_coach():
            # Coaches see their assigned athletes' training
            assigned_athletes = User.objects.get_by_coach(user)
            queryset = queryset.filter(athlete__in=assigned_athletes)
        else:
            return Training.objects.none()

        # Apply additional filters from query parameters
        sport = self.request.query_params.getlist('sport')
        if sport:
            queryset = queryset.filter(sport__in=sport)

        date_after = self.request.query_params.get('date_after')
        date_before = self.request.query_params.get('date_before')
        
        if date_after:
            try:
                date_after = datetime.fromisoformat(date_after.replace('Z', '+00:00'))
                queryset = queryset.filter(date__gte=date_after)
            except ValueError:
                pass
                
        if date_before:
            try:
                date_before = datetime.fromisoformat(date_before.replace('Z', '+00:00'))
                queryset = queryset.filter(date__lte=date_before)
            except ValueError:
                pass

        athlete_id = self.request.query_params.get('athlete')
        if athlete_id and user.is_coach():
            try:
                athlete = User.objects.get(id=athlete_id)
                # Verify coach has access to this athlete
                if User.objects.get_by_coach(user).filter(id=athlete_id).exists():
                    queryset = queryset.filter(athlete=athlete)
                else:
                    return Training.objects.none()
            except User.DoesNotExist:
                return Training.objects.none()

        return queryset

    def perform_create(self, serializer):
        """Ensure training is created for appropriate athlete"""
        user = self.request.user
        
        if user.is_athlete():
            serializer.save(athlete=user)
        elif user.is_coach():
            # Coach must specify which athlete this is for
            athlete_id = self.request.data.get('athlete')
            if not athlete_id:
                raise ValueError("Coach must specify athlete for training session.")
            
            try:
                athlete = User.objects.get(id=athlete_id)
                # Verify coach has access to this athlete
                if User.objects.get_by_coach(user).filter(id=athlete_id).exists():
                    serializer.save(athlete=athlete)
                else:
                    raise PermissionError("You don't have permission to create training for this athlete.")
            except User.DoesNotExist:
                raise ValueError("Specified athlete does not exist.")
        else:
            raise PermissionError("Only athletes and coaches can create training sessions.")

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """
        Get training sessions for calendar view with date filtering.
        GET /api/training/calendar/?date_after=2024-01-01&date_before=2024-12-31
        """
        trainings = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(trainings, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """
        Get upcoming training sessions (next 7 days).
        GET /api/training/upcoming/
        """
        end_date = timezone.now() + timedelta(days=7)
        trainings = self.get_queryset().filter(
            date__gte=timezone.now(),
            date__lte=end_date
        )
        serializer = self.get_serializer(trainings, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='this-week')
    def this_week(self, request):
        """
        Get this week's training sessions.
        GET /api/training/this-week/
        """
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        trainings = self.get_queryset().filter(
            date__date__gte=week_start,
            date__date__lte=week_end
        )
        serializer = self.get_serializer(trainings, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get training statistics by sport and time period.
        GET /api/training/stats/?period=month&sport=running
        """
        period = request.query_params.get('period', 'month')  # week, month, year
        sport = request.query_params.get('sport')
        
        # Calculate date range
        now = timezone.now()
        if period == 'week':
            start_date = now - timedelta(days=7)
        elif period == 'month':
            start_date = now - timedelta(days=30)
        elif period == 'year':
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=30)  # Default to month

        queryset = self.get_queryset().filter(date__gte=start_date)
        
        if sport:
            queryset = queryset.filter(sport=sport)

        # Calculate statistics
        total_sessions = queryset.count()
        
        # Calculate total duration (only for sessions that have duration)
        sessions_with_duration = queryset.exclude(duration__isnull=True)
        total_duration = sum([t.duration.total_seconds() for t in sessions_with_duration]) if sessions_with_duration else 0
        avg_duration = total_duration / total_sessions if total_sessions > 0 else 0

        # Sports breakdown
        sports_breakdown = {}
        for sport_choice in Training.SPORT_CHOICES:
            sport_name = sport_choice[0]
            sport_count = queryset.filter(sport=sport_name).count()
            if sport_count > 0:
                sports_breakdown[sport_name] = sport_count

        stats_data = {
            'period': period,
            'sport': sport,
            'total_sessions': total_sessions,
            'total_duration': timedelta(seconds=total_duration),
            'average_duration': timedelta(seconds=avg_duration),
            'sports_breakdown': sports_breakdown
        }

        serializer = TrainingStatsSerializer(stats_data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate an existing training session.
        POST /api/training/{id}/duplicate/
        """
        training = self.get_object()
        serializer = TrainingDuplicateSerializer(data=request.data)
        
        if serializer.is_valid():
            new_date = serializer.validated_data['new_date']
            new_title = serializer.validated_data.get('new_title', training.title)
            
            # Create duplicate
            new_training = Training.objects.create(
                title=new_title,
                athlete=training.athlete,
                date=new_date,
                duration=training.duration,
                time=training.time,
                sport=training.sport,
                training_data=training.training_data,
                notes=training.notes
            )
            
            response_serializer = TrainingSerializer(new_training)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RaceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for races with performance tracking.
    Athletes manage their own, coaches manage their athletes'.
    """
    
    queryset = Race.objects.all()
    serializer_class = RaceSerializer
    permission_classes = [IsOwnerOrCoach]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sport', 'location', 'athlete']
    search_fields = ['title', 'location']
    ordering_fields = ['date', 'created_at', 'distance']
    ordering = ['-date']

    def get_queryset(self):
        """Filter queryset based on user permissions and query parameters"""
        user = self.request.user
        queryset = Race.objects.select_related('athlete')
        
        if not user.is_authenticated:
            return Race.objects.none()
            
        if user.is_athlete():
            queryset = queryset.filter(athlete=user)
        elif user.is_coach():
            assigned_athletes = User.objects.get_by_coach(user)
            queryset = queryset.filter(athlete__in=assigned_athletes)
        else:
            return Race.objects.none()

        # Additional filters
        completed = self.request.query_params.get('completed')
        if completed == 'true':
            queryset = queryset.exclude(finish_time__isnull=True)
        elif completed == 'false':
            queryset = queryset.filter(finish_time__isnull=True)

        sport = self.request.query_params.getlist('sport')
        if sport:
            queryset = queryset.filter(sport__in=sport)

        return queryset

    def perform_create(self, serializer):
        """Ensure race is created for appropriate athlete"""
        user = self.request.user
        
        if user.is_athlete():
            serializer.save(athlete=user)
        elif user.is_coach():
            athlete_id = self.request.data.get('athlete')
            if not athlete_id:
                raise ValueError("Coach must specify athlete for race.")
            
            try:
                athlete = User.objects.get(id=athlete_id)
                if User.objects.get_by_coach(user).filter(id=athlete_id).exists():
                    serializer.save(athlete=athlete)
                else:
                    raise PermissionError("You don't have permission to create races for this athlete.")
            except User.DoesNotExist:
                raise ValueError("Specified athlete does not exist.")

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """
        Get upcoming races.
        GET /api/races/upcoming/
        """
        races = self.get_queryset().filter(date__gte=timezone.now())
        serializer = self.get_serializer(races, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def results(self, request):
        """
        Get completed races with results.
        GET /api/races/results/
        """
        races = self.get_queryset().exclude(finish_time__isnull=True)
        serializer = RaceResultsSerializer(races, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_sport(self, request):
        """
        Get races grouped by sport.
        GET /api/races/by-sport/
        """
        races = self.get_queryset()
        
        grouped_races = defaultdict(list)
        for race in races:
            grouped_races[race.sport].append(RaceSerializer(race).data)
        
        return Response(dict(grouped_races))


class CustomEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for custom events.
    Athletes manage their own, coaches manage their athletes'.
    """
    
    queryset = CustomEvent.objects.all()
    serializer_class = CustomEventSerializer
    permission_classes = [IsOwnerOrCoach]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['event_color', 'athlete']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['date', 'created_at', 'date_end']
    ordering = ['-date']

    def get_queryset(self):
        """Filter queryset based on user permissions"""
        user = self.request.user
        queryset = CustomEvent.objects.select_related('athlete')
        
        if not user.is_authenticated:
            return CustomEvent.objects.none()
            
        if user.is_athlete():
            queryset = queryset.filter(athlete=user)
        elif user.is_coach():
            assigned_athletes = User.objects.get_by_coach(user)
            queryset = queryset.filter(athlete__in=assigned_athletes)
        else:
            return CustomEvent.objects.none()

        return queryset

    def perform_create(self, serializer):
        """Ensure event is created for appropriate athlete"""
        user = self.request.user
        
        if user.is_athlete():
            serializer.save(athlete=user)
        elif user.is_coach():
            athlete_id = self.request.data.get('athlete')
            if not athlete_id:
                raise ValueError("Coach must specify athlete for custom event.")
            
            try:
                athlete = User.objects.get(id=athlete_id)
                if User.objects.get_by_coach(user).filter(id=athlete_id).exists():
                    serializer.save(athlete=athlete)
                else:
                    raise PermissionError("You don't have permission to create events for this athlete.")
            except User.DoesNotExist:
                raise ValueError("Specified athlete does not exist.")


class EventViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    Combined viewset for all event types (Training, Race, CustomEvent).
    Provides unified calendar and overview endpoints.
    """
    
    serializer_class = EventCalendarSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """This is not used since we override list method"""
        return []

    def list(self, request):
        """Override to return combined events from all types"""
        return Response({'error': 'Use specific endpoints like /calendar/ or /this-week/'})

    def create(self, request, *args, **kwargs):
        """Create an event by delegating to the appropriate specialized serializer."""

        serializer = EventCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        response_serializer_class = serializer.SERIALIZER_LOOKUP[serializer.normalized.serializer_path]
        response_serializer = response_serializer_class(instance, context={'request': request})
        response_data = response_serializer.data
        response_data['event_type'] = serializer.normalized.event_type

        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """
        Get all events for calendar display.
        GET /api/events/calendar/?date_after=2024-01-01&date_before=2024-12-31
        """
        user = request.user
        events = []

        # Get date filters
        date_after = request.query_params.get('date_after')
        date_before = request.query_params.get('date_before')

        # Helper function to apply date filters
        def apply_date_filter(queryset, date_field='date'):
            if date_after:
                try:
                    date_after_dt = datetime.fromisoformat(date_after.replace('Z', '+00:00'))
                    queryset = queryset.filter(**{f'{date_field}__gte': date_after_dt})
                except ValueError:
                    pass
            if date_before:
                try:
                    date_before_dt = datetime.fromisoformat(date_before.replace('Z', '+00:00'))
                    queryset = queryset.filter(**{f'{date_field}__lte': date_before_dt})
                except ValueError:
                    pass
            return queryset

        # Get user's events based on role
        if not user.is_authenticated:
            trainings = races = custom_events = []
        elif user.is_athlete():
            # Athlete's own events
            trainings = apply_date_filter(Training.objects.filter(athlete=user))
            races = apply_date_filter(Race.objects.filter(athlete=user))
            custom_events = apply_date_filter(CustomEvent.objects.filter(athlete=user))
        elif user.is_coach():
            # Coach's assigned athletes' events
            assigned_athletes = User.objects.get_by_coach(user)
            trainings = apply_date_filter(Training.objects.filter(athlete__in=assigned_athletes))
            races = apply_date_filter(Race.objects.filter(athlete__in=assigned_athletes))
            custom_events = apply_date_filter(CustomEvent.objects.filter(athlete__in=assigned_athletes))
        else:
            trainings = races = custom_events = []

        # Convert to unified format
        for training in trainings:
            events.append({
                'id': training.id,
                'title': training.title,
                'date': training.date,
                'event_type': 'training',
                'sport': training.sport,
                'athlete_id': training.athlete_id,
                'athlete_name': training.athlete.get_full_name(),
                'is_completed': False,  # Training doesn't have completion status
                'description': training.notes,
                'training_data': training.training_data  # Include training builder data
            })

        for race in races:
            events.append({
                'id': race.id,
                'title': race.title,
                'date': race.date,
                'event_type': 'race',
                'sport': race.sport,
                'athlete_id': race.athlete_id,
                'location': race.location,
                'is_completed': race.is_completed,
                'athlete_name': race.athlete.get_full_name(),
                'distance': race.distance,
                'description': race.description
            })

        for custom_event in custom_events:
            events.append({
                'id': custom_event.id,
                'title': custom_event.title,
                'date': custom_event.date,
                'date_end': custom_event.date_end,
                'event_type': 'custom_event',
                'location': custom_event.location,
                'event_color': custom_event.event_color,
                'athlete_id': custom_event.athlete_id,
                'athlete_name': custom_event.athlete.get_full_name(),
                'description': custom_event.description
            })

        # Sort by date
        events.sort(key=lambda x: x['date'])

        return Response(events)

    @action(detail=False, methods=['get'], url_path='this-week')
    def this_week(self, request):
        """
        Get current week's events.
        GET /api/events/this-week/
        """
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        # Modify request query params for date filtering
        modified_request = request
        modified_request.query_params = modified_request.query_params.copy()
        modified_request.query_params['date_after'] = week_start.isoformat()
        modified_request.query_params['date_before'] = week_end.isoformat()
        
        return self.calendar(modified_request)


class SavedTrainingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing saved training templates"""

    serializer_class = SavedTrainingSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for saved trainings

    def get_queryset(self):
        """Return saved trainings for the current user, optionally filtered by sport"""
        user = self.request.user
        queryset = SavedTraining.objects.filter(creator=user)

        # Filter by sport if provided
        sport = self.request.query_params.get('sport')
        if sport:
            queryset = queryset.filter(sport=sport)

        return queryset.select_related('creator')

    def perform_create(self, serializer):
        """Set the creator to the current user"""
        serializer.save(creator=self.request.user)

    @action(detail=False, methods=['get'])
    def by_sport(self, request):
        """Get saved trainings grouped by sport"""
        user = request.user
        trainings = SavedTraining.objects.filter(creator=user).values(
            'id', 'name', 'sport', 'description', 'training_data', 'created_at'
        )

        # Group by sport
        by_sport = {}
        for training in trainings:
            sport = training['sport']
            if sport not in by_sport:
                by_sport[sport] = []
            by_sport[sport].append(training)

        return Response(by_sport)
