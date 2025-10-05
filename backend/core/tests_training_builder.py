"""
Tests for Training Builder validation
Validates that the backend correctly handles simple and complex intervals
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from datetime import datetime
from core.events import Training

User = get_user_model()


class TrainingBuilderValidationTestCase(TestCase):
    """Test cases for training builder interval validation"""

    def setUp(self):
        """Create test user (athlete) for training sessions"""
        self.athlete = User.objects.create_user(
            username='testathlete',
            email='athlete@test.com',
            password='testpass123',
            user_type='athlete',
            first_name='Test',
            last_name='Athlete',
            phone_number='1234567890'
        )

    # === SIMPLE INTERVAL TESTS ===

    def test_simple_interval_time_based_valid(self):
        """Simple time-based interval should validate successfully"""
        training_data = {
            "intervals": [
                {
                    "name": "Tempo Run",
                    "type": "time",
                    "duration_or_distance": 20,
                    "unit": "minutes",
                    "repetitions": 1,
                    "intensity": 85,
                    "zone_type": "HR"
                }
            ]
        }

        training = Training(
            title="Test Training",
            athlete=self.athlete,
            date=datetime.now(),
            sport="running",
            training_data=training_data
        )

        # Should not raise ValidationError
        training.full_clean()
        training.save()
        self.assertIsNotNone(training.id)

    def test_simple_interval_distance_based_valid(self):
        """Simple distance-based interval should validate successfully"""
        training_data = {
            "intervals": [
                {
                    "name": "400m Repeats",
                    "type": "distance",
                    "duration_or_distance": 400,
                    "unit": "meters",
                    "repetitions": 5,
                    "intensity": 95,
                    "zone_type": "MAS"
                }
            ]
        }

        training = Training(
            title="Test Training",
            athlete=self.athlete,
            date=datetime.now(),
            sport="running",
            training_data=training_data
        )

        # Should not raise ValidationError
        training.full_clean()
        training.save()
        self.assertIsNotNone(training.id)

    def test_simple_interval_missing_type_fails(self):
        """Simple interval without type should fail"""
        training_data = {
            "intervals": [
                {
                    "name": "Bad Interval",
                    # Missing "type"
                    "duration_or_distance": 20,
                    "unit": "minutes",
                    "repetitions": 1
                }
            ]
        }

        training = Training(
            title="Test Training",
            athlete=self.athlete,
            date=datetime.now(),
            sport="running",
            training_data=training_data
        )

        with self.assertRaises(ValidationError) as context:
            training.full_clean()

        self.assertIn('must have type', str(context.exception))

    # === COMPLEX INTERVAL TESTS ===

    def test_complex_interval_with_work_and_rest_valid(self):
        """Complex interval with work and rest sub-intervals should validate"""
        training_data = {
            "intervals": [
                {
                    "name": "Main Set",
                    "repetitions": 5,
                    "sub_intervals": [
                        {
                            "work": {
                                "name": "400m Fast",
                                "type": "distance",
                                "duration_or_distance": 400,
                                "unit": "meters",
                                "intensity": 95,
                                "zone_type": "MAS"
                            },
                            "rest": {
                                "name": "Recovery Jog",
                                "duration": 90,
                                "unit": "seconds"
                            }
                        }
                    ]
                }
            ]
        }

        training = Training(
            title="Test Training",
            athlete=self.athlete,
            date=datetime.now(),
            sport="running",
            training_data=training_data
        )

        # Should not raise ValidationError
        training.full_clean()
        training.save()
        self.assertIsNotNone(training.id)

    def test_complex_interval_with_parent_data_fails(self):
        """Complex interval with parent-level type/duration_or_distance should fail"""
        training_data = {
            "intervals": [
                {
                    "name": "Bad Interval",
                    "type": "time",  # ❌ Should NOT be here
                    "duration_or_distance": 4,  # ❌ Should NOT be here
                    "unit": "minutes",  # ❌ Should NOT be here
                    "repetitions": 5,
                    "sub_intervals": [
                        {
                            "work": {
                                "name": "Work",
                                "type": "time",
                                "duration_or_distance": 2,
                                "unit": "minutes"
                            },
                            "rest": {
                                "name": "Rest",
                                "duration": 90,
                                "unit": "seconds"
                            }
                        }
                    ]
                }
            ]
        }

        training = Training(
            title="Test Training",
            athlete=self.athlete,
            date=datetime.now(),
            sport="running",
            training_data=training_data
        )

        with self.assertRaises(ValidationError) as context:
            training.full_clean()

        error_message = str(context.exception)
        self.assertIn('has sub_intervals', error_message)
        self.assertIn('parent-level fields', error_message)
        self.assertIn('type', error_message)

    def test_complex_interval_without_repetitions_fails(self):
        """Complex interval without repetitions should fail"""
        training_data = {
            "intervals": [
                {
                    "name": "Bad Interval",
                    # Missing repetitions
                    "sub_intervals": [
                        {
                            "work": {
                                "name": "Work",
                                "type": "time",
                                "duration_or_distance": 2,
                                "unit": "minutes"
                            }
                        }
                    ]
                }
            ]
        }

        training = Training(
            title="Test Training",
            athlete=self.athlete,
            date=datetime.now(),
            sport="running",
            training_data=training_data
        )

        with self.assertRaises(ValidationError) as context:
            training.full_clean()

        error_message = str(context.exception)
        self.assertIn('must have repetitions', error_message)
        self.assertIn('work+rest sequence', error_message)

    def test_complex_interval_with_empty_sub_intervals_fails(self):
        """Complex interval with empty sub_intervals array should fail"""
        training_data = {
            "intervals": [
                {
                    "name": "Bad Interval",
                    "repetitions": 5,
                    "sub_intervals": []  # ❌ Empty array
                }
            ]
        }

        training = Training(
            title="Test Training",
            athlete=self.athlete,
            date=datetime.now(),
            sport="running",
            training_data=training_data
        )

        with self.assertRaises(ValidationError) as context:
            training.full_clean()

        error_message = str(context.exception)
        self.assertIn('sub_intervals but the array is empty', error_message)

    # === COMPLETE TRAINING TESTS ===

    def test_complete_training_with_warmup_intervals_cooldown(self):
        """Complete training with warmup, complex interval, and cooldown"""
        training_data = {
            "warmup": {
                "name": "Easy Jog",
                "duration": 15,
                "unit": "minutes",
                "intensity": 60,
                "zone_type": "HR"
            },
            "intervals": [
                {
                    "name": "Speed Set",
                    "repetitions": 5,
                    "sub_intervals": [
                        {
                            "work": {
                                "name": "400m Fast",
                                "type": "distance",
                                "duration_or_distance": 400,
                                "unit": "meters",
                                "intensity": 95,
                                "zone_type": "MAS"
                            },
                            "rest": {
                                "name": "Recovery",
                                "duration": 90,
                                "unit": "seconds"
                            }
                        }
                    ]
                }
            ],
            "cooldown": {
                "name": "Easy Jog",
                "duration": 10,
                "unit": "minutes"
            }
        }

        training = Training(
            title="Speed Workout",
            athlete=self.athlete,
            date=datetime.now(),
            sport="running",
            training_data=training_data
        )

        # Should not raise ValidationError
        training.full_clean()
        training.save()
        self.assertIsNotNone(training.id)

        # Verify data was saved correctly
        saved_training = Training.objects.get(id=training.id)
        self.assertEqual(saved_training.training_data['warmup']['name'], 'Easy Jog')
        self.assertEqual(len(saved_training.training_data['intervals']), 1)
        self.assertEqual(saved_training.training_data['intervals'][0]['repetitions'], 5)

    def test_mixed_simple_and_complex_intervals(self):
        """Training with both simple and complex intervals"""
        training_data = {
            "intervals": [
                # Simple interval
                {
                    "name": "Tempo Run",
                    "type": "time",
                    "duration_or_distance": 20,
                    "unit": "minutes",
                    "repetitions": 1,
                    "intensity": 85,
                    "zone_type": "HR"
                },
                # Complex interval
                {
                    "name": "Sprint Set",
                    "repetitions": 6,
                    "sub_intervals": [
                        {
                            "work": {
                                "name": "200m Sprint",
                                "type": "distance",
                                "duration_or_distance": 200,
                                "unit": "meters",
                                "intensity": 100,
                                "zone_type": "MAS"
                            },
                            "rest": {
                                "name": "Walk Recovery",
                                "duration": 60,
                                "unit": "seconds"
                            }
                        }
                    ]
                }
            ]
        }

        training = Training(
            title="Mixed Workout",
            athlete=self.athlete,
            date=datetime.now(),
            sport="running",
            training_data=training_data
        )

        # Should not raise ValidationError
        training.full_clean()
        training.save()
        self.assertIsNotNone(training.id)

    # === EDGE CASES ===

    def test_complex_interval_multiple_work_rest_pairs(self):
        """Complex interval with multiple work/rest pairs in sequence"""
        training_data = {
            "intervals": [
                {
                    "name": "Pyramid Set",
                    "repetitions": 3,
                    "sub_intervals": [
                        {
                            "work": {
                                "name": "200m",
                                "type": "distance",
                                "duration_or_distance": 200,
                                "unit": "meters",
                                "intensity": 95,
                                "zone_type": "MAS"
                            },
                            "rest": {
                                "name": "Rest",
                                "duration": 60,
                                "unit": "seconds"
                            }
                        },
                        {
                            "work": {
                                "name": "400m",
                                "type": "distance",
                                "duration_or_distance": 400,
                                "unit": "meters",
                                "intensity": 90,
                                "zone_type": "MAS"
                            },
                            "rest": {
                                "name": "Rest",
                                "duration": 90,
                                "unit": "seconds"
                            }
                        },
                        {
                            "work": {
                                "name": "200m",
                                "type": "distance",
                                "duration_or_distance": 200,
                                "unit": "meters",
                                "intensity": 95,
                                "zone_type": "MAS"
                            },
                            "rest": {
                                "name": "Rest",
                                "duration": 60,
                                "unit": "seconds"
                            }
                        }
                    ]
                }
            ]
        }

        training = Training(
            title="Pyramid Workout",
            athlete=self.athlete,
            date=datetime.now(),
            sport="running",
            training_data=training_data
        )

        # Should not raise ValidationError
        training.full_clean()
        training.save()
        self.assertIsNotNone(training.id)


class TrainingBuilderSerializationTestCase(TestCase):
    """Test that training data serialization works correctly"""

    def setUp(self):
        self.athlete = User.objects.create_user(
            username='testathlete',
            email='athlete@test.com',
            password='testpass123',
            user_type='athlete',
            first_name='Test',
            last_name='Athlete',
            phone_number='1234567890'
        )

    def test_training_with_complex_interval_serializes_correctly(self):
        """Verify training with complex intervals can be saved and retrieved"""
        original_data = {
            "warmup": {
                "name": "Warmup",
                "duration": 10,
                "unit": "minutes"
            },
            "intervals": [
                {
                    "name": "Main Set",
                    "repetitions": 5,
                    "sub_intervals": [
                        {
                            "work": {
                                "name": "Work",
                                "type": "time",
                                "duration_or_distance": 4,
                                "unit": "minutes",
                                "intensity": 90,
                                "zone_type": "HR"
                            },
                            "rest": {
                                "name": "Rest",
                                "duration": 2,
                                "unit": "minutes"
                            }
                        }
                    ]
                }
            ],
            "cooldown": {
                "name": "Cooldown",
                "duration": 5,
                "unit": "minutes"
            }
        }

        training = Training.objects.create(
            title="Test Workout",
            athlete=self.athlete,
            date=datetime.now(),
            sport="running",
            training_data=original_data
        )

        # Retrieve and verify
        retrieved = Training.objects.get(id=training.id)
        self.assertEqual(retrieved.training_data, original_data)
        self.assertEqual(retrieved.training_data['intervals'][0]['repetitions'], 5)
        self.assertEqual(len(retrieved.training_data['intervals'][0]['sub_intervals']), 1)
