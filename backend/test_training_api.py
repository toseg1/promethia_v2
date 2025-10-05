#!/usr/bin/env python3
"""
Test script to verify training API endpoints work correctly after timezone fixes.
Run this script to test the API without manual curl commands.
"""
import os
import sys
import django
from django.conf import settings

# Add the backend directory to Python path
sys.path.append('/Users/Gins/developments/promethia_react_v2/backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta
from django.utils import timezone
import json

User = get_user_model()

def test_training_creation():
    """Test training creation with both athlete and coach users"""
    client = Client()
    
    print("🧪 Testing Training API...")
    
    # Test 1: Create athlete user and training
    print("\n1️⃣  Testing athlete training creation...")
    
    # Create athlete user
    athlete_data = {
        'username': 'testathlete',
        'email': 'athlete@test.com',
        'password': 'testpass123',
        'password_confirm': 'testpass123',
        'first_name': 'Test',
        'last_name': 'Athlete',
        'user_type': 'athlete'
    }
    
    registration_response = client.post('/api/v1/users/register/', 
                                       data=json.dumps(athlete_data),
                                       content_type='application/json')
    
    if registration_response.status_code == 201:
        print("✅ Athlete registration successful")
        athlete_tokens = registration_response.json()['tokens']
        access_token = athlete_tokens['access']
        
        # Create training session for athlete
        training_data = {
            'title': 'Test Morning Run',
            'date': (timezone.now() + timedelta(days=1)).isoformat(),
            'sport': 'running',
            'duration': '01:30:00',
            'notes': 'Easy pace recovery run'
        }
        
        headers = {'Authorization': f'Bearer {access_token}'}
        training_response = client.post('/api/v1/training/',
                                      data=json.dumps(training_data),
                                      content_type='application/json',
                                      **headers)
        
        if training_response.status_code == 201:
            print("✅ Athlete training creation successful!")
            training_result = training_response.json()
            print(f"   Created training: {training_result['title']} for {training_result['athlete_name']}")
            print(f"   Is upcoming: {training_result['is_upcoming']}")
        else:
            print(f"❌ Athlete training creation failed: {training_response.status_code}")
            print(f"   Error: {training_response.json()}")
            
    else:
        print(f"❌ Athlete registration failed: {registration_response.status_code}")
        print(f"   Error: {registration_response.json()}")

    # Test 2: Create coach user 
    print("\n2️⃣  Testing coach training creation...")
    
    coach_data = {
        'username': 'testcoach',
        'email': 'coach@test.com', 
        'password': 'testpass123',
        'password_confirm': 'testpass123',
        'first_name': 'Test',
        'last_name': 'Coach',
        'user_type': 'coach'
    }
    
    coach_registration = client.post('/api/v1/users/register/',
                                   data=json.dumps(coach_data),
                                   content_type='application/json')
    
    if coach_registration.status_code == 201:
        print("✅ Coach registration successful")
        coach_tokens = coach_registration.json()['tokens']
        coach_access_token = coach_tokens['access']
        
        # Get the athlete ID for testing coach-athlete training creation
        try:
            athlete = User.objects.get(email='athlete@test.com')
            athlete_id = athlete.id
            
            # Create training session as coach for athlete
            coach_training_data = {
                'title': 'Coach Assigned Interval Training',
                'athlete': athlete_id,
                'date': (timezone.now() + timedelta(days=2)).isoformat(),
                'sport': 'running',
                'duration': '01:00:00',
                'notes': 'Speed work - 6x800m intervals'
            }
            
            coach_headers = {'Authorization': f'Bearer {coach_access_token}'}
            coach_training_response = client.post('/api/v1/training/',
                                                data=json.dumps(coach_training_data),
                                                content_type='application/json',
                                                **coach_headers)
            
            if coach_training_response.status_code == 201:
                print("✅ Coach training creation successful!")
                coach_training_result = coach_training_response.json()
                print(f"   Created training: {coach_training_result['title']} for {coach_training_result['athlete_name']}")
            else:
                print(f"❌ Coach training creation failed: {coach_training_response.status_code}")
                print(f"   Error: {coach_training_response.json()}")
                
        except User.DoesNotExist:
            print("❌ Could not find athlete user for coach training test")
            
    else:
        print(f"❌ Coach registration failed: {coach_registration.status_code}")
        print(f"   Error: {coach_registration.json()}")

    # Test 3: List training sessions
    print("\n3️⃣  Testing training list endpoint...")
    
    if 'access_token' in locals():
        headers = {'Authorization': f'Bearer {access_token}'}
        list_response = client.get('/api/v1/training/', **headers)
        
        if list_response.status_code == 200:
            training_list = list_response.json()
            print(f"✅ Training list retrieved successfully!")
            print(f"   Found {training_list['count']} training sessions")
            for training in training_list['results']:
                print(f"   - {training['title']} by {training['athlete_name']} on {training['date'][:10]}")
        else:
            print(f"❌ Training list failed: {list_response.status_code}")

    print("\n🎉 Testing completed!")

if __name__ == '__main__':
    try:
        test_training_creation()
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()