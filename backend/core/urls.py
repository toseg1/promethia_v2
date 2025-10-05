from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import TrainingViewSet, RaceViewSet, CustomEventViewSet, EventViewSet, SavedTrainingViewSet

app_name = 'core'

# Create router and register viewsets
router = DefaultRouter()
router.register(r'training', TrainingViewSet, basename='training')
router.register(r'races', RaceViewSet, basename='race')
router.register(r'custom-events', CustomEventViewSet, basename='customevent')
router.register(r'events', EventViewSet, basename='event')
router.register(r'saved-trainings', SavedTrainingViewSet, basename='saved-training')

urlpatterns = [
    # Include DRF router URLs
    path('', include(router.urls)),
]

# API endpoints provided by the router:
#
# Training Sessions:
# GET /api/training/ - List training sessions (with filtering)
# POST /api/training/ - Create training session
# GET /api/training/{id}/ - Training detail
# PATCH /api/training/{id}/ - Update training
# DELETE /api/training/{id}/ - Delete training
# GET /api/training/calendar/ - Calendar view with date filtering
# GET /api/training/upcoming/ - Next 7 days training
# GET /api/training/this-week/ - This week's training
# GET /api/training/stats/ - Training statistics
# POST /api/training/{id}/duplicate/ - Duplicate training session
#
# Race Events:
# GET /api/races/ - List races (with filtering)
# POST /api/races/ - Create race
# GET /api/races/{id}/ - Race detail
# PATCH /api/races/{id}/ - Update race
# DELETE /api/races/{id}/ - Delete race
# GET /api/races/upcoming/ - Upcoming races
# GET /api/races/results/ - Completed races with results
# GET /api/races/by-sport/ - Races grouped by sport
#
# Custom Events:
# GET /api/custom-events/ - List custom events
# POST /api/custom-events/ - Create custom event
# GET /api/custom-events/{id}/ - Custom event detail
# PATCH /api/custom-events/{id}/ - Update custom event
# DELETE /api/custom-events/{id}/ - Delete custom event
#
# Combined Events (Unified Calendar):
# GET /api/events/calendar/ - All events for calendar view
# GET /api/events/this-week/ - This week's all events
#
# Filtering Examples:
# GET /api/training/?sport=running,cycling - Filter by sports
# GET /api/training/?date_after=2024-01-01&date_before=2024-12-31 - Date range
# GET /api/training/?athlete=123 - Filter by athlete (coaches only)
# GET /api/training/?search=interval - Search in title/notes
# GET /api/races/?completed=true - Only completed races
# GET /api/races/?sport=triathlon&location=Boston - Multiple filters
# GET /api/custom-events/?event_color=red - Filter by color