#!/usr/bin/env python3
"""
Integration test script for AI-powered enrollment and face verification system.
Tests the full flow from registration to live face verification.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import json
from django.contrib.auth import get_user_model
from accounts.models import PassportData
from enrollment.models import Applicant, ApplicantDocument, VerificationResult
from live.models import LiveRoom, FaceVerificationSettings, LiveFaceSession
from ai.models import AISettings
from ai import clients

User = get_user_model()

def print_section(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def test_ai_gateway_connection():
    """Test AI Gateway connection"""
    print_section("1. AI Gateway Connection Test")
    
    ai_settings = AISettings.get_active()
    print(f"AI Enabled: {ai_settings.ai_enabled}")
    print(f"API Base URL: {ai_settings.api_base_url}")
    print(f"Face Match Enabled: {ai_settings.enable_face_match}")
    print(f"Presence Check Enabled: {ai_settings.enable_presence}")
    
    health = clients.health_check()
    if health and health.get('ok'):
        print("✅ AI Gateway is HEALTHY")
        print(f"   Gateway data: {health.get('data')}")
        return True
    else:
        print("❌ AI Gateway is UNREACHABLE")
        print(f"   Reason: {health.get('reason') if health else 'Unknown'}")
        return False

def test_registration_flow():
    """Test registration with passport OCR and face matching"""
    print_section("2. Registration Flow Test")
    
    # Check if we have test applicants
    applicants = Applicant.objects.all()[:5]
    print(f"Total applicants in database: {Applicant.objects.count()}")
    
    for applicant in applicants:
        print(f"\nApplicant: {applicant.full_name}")
        print(f"  Status: {applicant.status}")
        print(f"  Passport ID: {applicant.passport_id or applicant.card_number}")
        print(f"  Birth Date: {applicant.birth_date}")
        
        # Check documents
        if hasattr(applicant, 'documents'):
            docs = applicant.documents
            print(f"  Has passport front: {'✅' if docs.passport_front else '❌'}")
            print(f"  Has passport back: {'✅' if docs.passport_back else '❌'}")
            print(f"  Has face image: {'✅' if docs.face_image else '❌'}")
        
        # Check verification results
        verifications = applicant.verifications.all()
        if verifications.exists():
            latest = verifications.first()
            print(f"  Verified: {'✅' if latest.verified else '❌'}")
            print(f"  Confidence: {latest.confidence:.2%}")
            
            # Show events
            events = latest.events_json
            for event in events:
                event_type = event.get('type')
                event_status = event.get('status')
                print(f"    - {event_type}: {event_status}")
        else:
            print(f"  No verification results")

def test_passport_data():
    """Test passport data storage"""
    print_section("3. Passport Data Storage Test")
    
    passport_data = PassportData.objects.select_related('user').all()[:5]
    print(f"Total passport records: {PassportData.objects.count()}")
    
    for passport in passport_data:
        print(f"\nUser: {passport.user.username}")
        print(f"  Full Name: {passport.extracted_fullname}")
        print(f"  Passport: {passport.passport_series} {passport.passport_number}")
        print(f"  Card Number: {passport.card_number}")
        print(f"  Personal Number: {passport.personal_number}")
        print(f"  Birth Date: {passport.birth_date}")
        print(f"  Birth Place: {passport.birth_place}")
        print(f"  Sex: {passport.sex}")
        print(f"  Citizenship: {passport.citizenship}")
        print(f"  Has front image: {'✅' if passport.front_image else '❌'}")
        print(f"  Has back image: {'✅' if passport.back_image else '❌'}")
        print(f"  Has selfie: {'✅' if passport.selfie_image else '❌'}")

def test_face_embeddings():
    """Test face embeddings in user profiles"""
    print_section("4. Face Embeddings Test")
    
    users_with_faces = User.objects.filter(face_image__isnull=False)
    users_with_embeddings = User.objects.filter(face_embedding__isnull=False)
    
    print(f"Users with face images: {users_with_faces.count()}")
    print(f"Users with face embeddings: {users_with_embeddings.count()}")
    
    for user in users_with_embeddings[:5]:
        embedding = user.face_embedding
        if embedding and isinstance(embedding, list):
            print(f"\n{user.username}:")
            print(f"  Role: {user.role}")
            print(f"  Embedding length: {len(embedding)}")
            print(f"  Sample values: {embedding[:5]}...")
        else:
            print(f"\n{user.username}: Invalid embedding format")

def test_live_verification_settings():
    """Test live face verification settings"""
    print_section("5. Live Face Verification Settings")
    
    settings = FaceVerificationSettings.get_settings()
    print(f"Verification Enabled: {settings.verification_enabled}")
    print(f"Verification Interval: {settings.verification_interval}s")
    print(f"Confidence Threshold: {settings.confidence_threshold}")
    print(f"Max Faces Allowed: {settings.max_faces_allowed}")
    print(f"Auto Attendance: {settings.auto_attendance}")
    print(f"Alert on Multiple Faces: {settings.alert_on_multiple_faces}")
    print(f"Alert on No Face: {settings.alert_on_no_face}")
    print(f"Alert on Fail: {settings.alert_on_verification_fail}")

def test_live_rooms():
    """Test live room setup"""
    print_section("6. Live Rooms Test")
    
    active_rooms = LiveRoom.objects.filter(is_active=True)
    all_rooms = LiveRoom.objects.all()
    
    print(f"Active rooms: {active_rooms.count()}")
    print(f"Total rooms: {all_rooms.count()}")
    
    for room in all_rooms[:5]:
        print(f"\nRoom: {room.room_name}")
        print(f"  Active: {'✅' if room.is_active else '❌'}")
        print(f"  Started: {room.started_at}")
        print(f"  Participants: {room.participants.count()}")
        
        # Check face sessions
        sessions = LiveFaceSession.objects.filter(room=room)
        if sessions.exists():
            print(f"  Face sessions: {sessions.count()}")
            for session in sessions[:3]:
                print(f"    - {session.user.username}: {session.status} "
                      f"(Success rate: {session.success_rate:.1f}%)")

def generate_summary():
    """Generate overall system summary"""
    print_section("SYSTEM SUMMARY")
    
    stats = {
        'Total Users': User.objects.count(),
        'Students': User.objects.filter(role='student').count(),
        'Teachers': User.objects.filter(role='teacher').count(),
        'Admins': User.objects.filter(role='admin').count(),
        'Users with Face Images': User.objects.filter(face_image__isnull=False).count(),
        'Users with Face Embeddings': User.objects.filter(face_embedding__isnull=False).count(),
        'Applicants': Applicant.objects.count(),
        'Verified Applicants': Applicant.objects.filter(status='verified').count(),
        'Approved Applicants': Applicant.objects.filter(status='approved').count(),
        'Passport Records': PassportData.objects.count(),
        'Live Rooms (Active)': LiveRoom.objects.filter(is_active=True).count(),
        'Live Rooms (Total)': LiveRoom.objects.count(),
        'Face Sessions': LiveFaceSession.objects.count(),
    }
    
    for key, value in stats.items():
        print(f"{key:.<40} {value}")

def main():
    print("\n" + "=" * 60)
    print("  AI-POWERED ENROLLMENT & FACE VERIFICATION TEST")
    print("=" * 60)
    
    try:
        # Run all tests
        ai_healthy = test_ai_gateway_connection()
        test_registration_flow()
        test_passport_data()
        test_face_embeddings()
        test_live_verification_settings()
        test_live_rooms()
        generate_summary()
        
        print_section("TEST COMPLETE")
        if ai_healthy:
            print("✅ All systems operational")
        else:
            print("⚠️  AI Gateway not reachable - some features may be limited")
        
        return 0
    
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
