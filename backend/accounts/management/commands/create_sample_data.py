from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import AthleticProfile, ProfessionalProfile, Achievement, Certification
from core.events import Training, Race, CustomEvent
from datetime import datetime, timedelta, time
import json

User = get_user_model()


class Command(BaseCommand):
    help = 'Create sample data for testing the sports training application'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Creating sample data...'))
        
        # Create sample coach
        coach = User.objects.create_user(
            username='coach_mike',
            email='mike@example.com',
            password='testpass123',
            first_name='Mike',
            last_name='Johnson',
            user_type='coach',
            country_number='+1',
            phone_number='5551234567'
        )
        
        coach_profile = ProfessionalProfile.objects.create(
            user=coach,
            experience_years=8,
            about_notes='Experienced triathlon coach with focus on endurance training.'
        )
        
        # Add coach certification
        Certification.objects.create(
            profile=coach_profile,
            sport='triathlon',
            year=2020,
            title='USA Triathlon Level II Coach',
            issuing_organization='USA Triathlon'
        )
        
        # Create sample athletes
        athlete1 = User.objects.create_user(
            username='athlete_sarah',
            email='sarah@example.com',
            password='testpass123',
            first_name='Sarah',
            last_name='Williams',
            user_type='athlete',
            country_number='+1',
            phone_number='5551234568',
            coach=coach,
            mas=16.5,
            fpp=285.0,
            css=1.35
        )
        
        athlete_profile1 = AthleticProfile.objects.create(
            user=athlete1,
            experience_years=5,
            sports_involved='triathlon',
            about_notes='Competitive triathlete focusing on Olympic distance races.'
        )
        
        # Add achievement for athlete
        Achievement.objects.create(
            profile=athlete_profile1,
            category='race_achievement',
            year=2023,
            title='Olympic Distance Triathlon - 1st Place Age Group',
            description='Won first place in 25-29 age group at Regional Olympic Triathlon Championship'
        )
        
        athlete2 = User.objects.create_user(
            username='athlete_john',
            email='john@example.com',
            password='testpass123',
            first_name='John',
            last_name='Smith',
            user_type='athlete',
            country_number='+1',
            phone_number='5551234569',
            coach=coach,
            mas=18.2
        )
        
        athlete_profile2 = AthleticProfile.objects.create(
            user=athlete2,
            experience_years=3,
            sports_involved='running',
            about_notes='Marathon runner with sub-3:00 goal.'
        )
        
        # Create sample training data
        training_data = {
            "warmup": {
                "name": "Easy Warm-up",
                "duration": 15,
                "unit": "minutes",
                "notes": "Zone 1 easy pace"
            },
            "intervals": [
                {
                    "name": "Main Set",
                    "type": "time",
                    "duration_or_distance": 30,
                    "unit": "minutes",
                    "repetitions": 1,
                    "intensity_percent": 85,
                    "zone_type": "tempo",
                    "notes": "Tempo effort",
                    "sub_intervals": [
                        {
                            "work": {
                                "name": "Work",
                                "type": "time",
                                "duration_or_distance": 5,
                                "unit": "minutes",
                                "repetitions": 6,
                                "intensity_percent": 90,
                                "zone_type": "threshold"
                            },
                            "rest": {
                                "name": "Recovery",
                                "duration": 1,
                                "unit": "minutes"
                            }
                        }
                    ]
                }
            ],
            "cooldown": {
                "name": "Cool Down",
                "duration": 10,
                "unit": "minutes",
                "notes": "Zone 1 recovery pace"
            }
        }
        
        # Create sample training sessions
        Training.objects.create(
            title='Morning Tempo Run',
            athlete=athlete1,
            date=datetime.now() + timedelta(days=1),
            duration=timedelta(hours=1, minutes=15),
            time=time(6, 30),
            sport='running',
            training_data=training_data,
            notes='Focus on maintaining steady effort throughout tempo sections'
        )
        
        Training.objects.create(
            title='Bike Intervals',
            athlete=athlete1,
            date=datetime.now() + timedelta(days=3),
            duration=timedelta(hours=2),
            time=time(7, 0),
            sport='cycling',
            training_data={
                "warmup": {
                    "name": "Warm-up",
                    "duration": 20,
                    "unit": "minutes"
                },
                "intervals": [
                    {
                        "name": "Power Intervals",
                        "type": "time",
                        "duration_or_distance": 4,
                        "unit": "minutes",
                        "repetitions": 6,
                        "intensity_percent": 95,
                        "zone_type": "vo2max"
                    }
                ],
                "cooldown": {
                    "name": "Cool-down",
                    "duration": 15,
                    "unit": "minutes"
                }
            }
        )
        
        # Create sample race
        Race.objects.create(
            title='Local Olympic Triathlon',
            athlete=athlete1,
            date=datetime.now() + timedelta(days=30),
            sport='triathlon',
            location='City Park',
            distance='51.5 km',  # Olympic distance in km (1.5k swim + 40k bike + 10k run)
            description='Olympic distance triathlon focusing on consistent pacing across all disciplines.',
            target_time=timedelta(hours=2, minutes=30)
        )

        # Create past race with finish time
        Race.objects.create(
            title='Sprint Triathlon',
            athlete=athlete1,
            date=datetime.now() - timedelta(days=15),
            sport='triathlon',
            location='Lake Resort',
            distance='25.75 km',  # Sprint distance
            description='Sprint distance triathlon used as a fitness benchmark.',
            target_time=timedelta(hours=1, minutes=15),
            finish_time=timedelta(hours=1, minutes=12, seconds=34)
        )
        
        # Create custom event
        CustomEvent.objects.create(
            title='Training Camp',
            athlete=athlete1,
            date=datetime.now() + timedelta(days=60),
            date_end=datetime.now() + timedelta(days=67),
            location='Mountain Training Center',
            event_color='green',
            description='Week-long high-altitude training camp focusing on endurance base building.'
        )
        
        self.stdout.write(
            self.style.SUCCESS('Successfully created sample data:')
        )
        self.stdout.write(f'- 1 Coach: {coach.get_full_name()}')
        self.stdout.write(f'- 2 Athletes: {athlete1.get_full_name()}, {athlete2.get_full_name()}')
        self.stdout.write('- Training sessions, races, and custom events')
        self.stdout.write('- Achievement and certification records')
