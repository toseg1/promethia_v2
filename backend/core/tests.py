from datetime import timedelta

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CoachAssignment, User
from .events import CustomEvent, Race, Training


class EventCreationAPITests(APITestCase):
    """Integration tests for the unified event creation endpoint."""

    def setUp(self):
        self.events_url = reverse('api:v1:core:event-list')

        self.athlete = User.objects.create_user(
            email='athlete@example.com',
            password='password123',
            username='athlete1',
            first_name='Athlete',
            last_name='One',
            user_type='athlete',
        )

        self.coach = User.objects.create_user(
            email='coach@example.com',
            password='password123',
            username='coach1',
            first_name='Coach',
            last_name='Primary',
            user_type='coach',
        )

        CoachAssignment.objects.create(mentee=self.athlete, coach=self.coach)

    def test_athlete_can_create_training_event(self):
        """Athletes can create training sessions without specifying athlete field."""

        self.client.force_authenticate(user=self.athlete)

        payload = {
            'type': 'training',
            'title': 'Easy Run',
            'date': '2024-05-10',
            'time': '07:30',
            'sport': 'running',
            'duration': '45',
            'trainingBlocks': [
                {
                    'id': 'warmup-1',
                    'type': 'warmup',
                    'name': 'Warm Up',
                    'duration': '10',
                    'durationUnit': 'min',
                },
                {
                    'id': 'interval-1',
                    'type': 'interval',
                    'name': 'Main Set',
                    'duration': '5',
                    'durationUnit': 'min',
                    'repetitions': 4,
                    'intervalType': 'time',
                },
                {
                    'id': 'cooldown-1',
                    'type': 'cooldown',
                    'name': 'Cool Down',
                    'duration': '10',
                    'durationUnit': 'min',
                },
            ],
            'description': 'Easy aerobic effort.',
        }

        response = self.client.post(self.events_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['event_type'], 'training')
        training = Training.objects.get(title='Easy Run')
        self.assertEqual(training.athlete, self.athlete)
        self.assertEqual(training.sport, 'running')
        self.assertAlmostEqual(training.duration.total_seconds(), 2700)  # 45 minutes
        self.assertIn('warmup', training.training_data)
        self.assertEqual(training.training_data['warmup']['duration'], 10.0)

    def test_coach_can_create_race_for_assigned_athlete(self):
        """Coaches can create races for athletes they are assigned to."""

        self.client.force_authenticate(user=self.coach)

        payload = {
            'type': 'race',
            'title': 'City 10K',
            'dateStart': '2024-06-10',
            'time': '08:00',
            'sport': 'running',
            'location': 'Central Park',
            'distance': '10K',
            'timeObjective': '45',
            'athlete': str(self.athlete.id),
            'description': 'Goal race for the season.',
        }

        response = self.client.post(self.events_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['event_type'], 'race')

        race = Race.objects.get(title='City 10K')
        self.assertEqual(race.athlete, self.athlete)
        self.assertEqual(race.location, 'Central Park')
        self.assertEqual(race.distance, '10K')
        self.assertEqual(race.target_time, timedelta(minutes=45))

    def test_custom_event_color_is_mapped(self):
        """Custom events map hex colours to defined choices and auto-extend end date."""

        self.client.force_authenticate(user=self.coach)

        payload = {
            'type': 'custom',
            'title': 'Physio Session',
            'dateStart': '2024-05-15',
            'dateEnd': '2024-05-15',
            'customEventColor': '#f97316',
            'athlete': str(self.athlete.id),
            'description': 'Post-race recovery.',
        }

        response = self.client.post(self.events_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['event_type'], 'custom')

        custom_event = CustomEvent.objects.get(title='Physio Session')
        self.assertEqual(custom_event.athlete, self.athlete)
        self.assertEqual(custom_event.event_color, 'orange')
        self.assertTrue(custom_event.date_end > custom_event.date)

    def test_coach_requires_assignment_for_athlete(self):
        """Coach cannot create events for athletes they are not assigned to."""

        other_athlete = User.objects.create_user(
            email='other-athlete@example.com',
            password='password123',
            username='athlete2',
            first_name='Athlete',
            last_name='Two',
            user_type='athlete',
        )

        self.client.force_authenticate(user=self.coach)

        payload = {
            'type': 'race',
            'title': 'Unauthorized Race',
            'dateStart': '2024-07-01',
            'sport': 'running',
            'athlete': str(other_athlete.id),
        }

        response = self.client.post(self.events_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('athlete', response.data)
        self.assertFalse(Race.objects.filter(title='Unauthorized Race').exists())

    def test_authentication_required(self):
        """Unauthenticated users cannot create events."""

        payload = {
            'type': 'training',
            'title': 'No Auth Session',
            'date': '2024-05-10',
            'sport': 'running',
        }

        response = self.client.post(self.events_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
