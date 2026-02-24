#!/usr/bin/env python3
"""
Script to extract and save face embeddings for users who have face images but no embeddings.
This is crucial for live face verification to work properly.
"""
import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from ai import clients
from ai.models import AISettings

User = get_user_model()

def extract_face_embedding_from_image(image_file):
    """Extract face embedding from user's face image using AI Gateway"""
    try:
        # Read image file
        with image_file.open('rb') as f:
            image_bytes = f.read()
        
        # Call AI Gateway to analyze face
        result = clients.face_analyze(image_bytes)
        
        if not result:
            print("    ❌ AI analysis failed")
            return None
        
        faces_detected = result.get('faces_detected', 0)
        if faces_detected == 0:
            print(f"    ❌ No faces detected")
            return None
        
        if faces_detected > 1:
            print(f"    ⚠️  Multiple faces detected ({faces_detected}), using first")
        
        faces = result.get('faces', [])
        if not faces:
            print("    ❌ No face data returned")
            return None
        
        primary_face = faces[0]
        embedding = primary_face.get('embedding', [])
        
        if not embedding:
            print("    ❌ No embedding in face data")
            return None
        
        print(f"    ✅ Extracted embedding (length: {len(embedding)})")
        return embedding
    
    except Exception as e:
        print(f"    ❌ Error: {e}")
        return None

def process_users():
    """Process all users with face images but no embeddings"""
    print("\n" + "=" * 60)
    print("  FACE EMBEDDING EXTRACTION")
    print("=" * 60)
    
    # Check AI Gateway
    ai_settings = AISettings.get_active()
    if not ai_settings.ai_enabled:
        print("\n❌ AI is disabled in settings")
        return
    
    health = clients.health_check()
    if not health or not health.get('ok'):
        print("\n❌ AI Gateway is not reachable")
        print(f"   Reason: {health.get('reason') if health else 'Unknown'}")
        return
    
    print("\n✅ AI Gateway is healthy")
    
    # Find users without embeddings
    users_with_images = User.objects.filter(face_image__isnull=False)
    users_without_embeddings = users_with_images.filter(face_embedding__isnull=True)
    
    print(f"\nUsers with face images: {users_with_images.count()}")
    print(f"Users without embeddings: {users_without_embeddings.count()}")
    
    if users_without_embeddings.count() == 0:
        print("\n✅ All users with face images already have embeddings!")
        return
    
    print("\n" + "-" * 60)
    print("Processing users...")
    print("-" * 60)
    
    success_count = 0
    fail_count = 0
    
    for user in users_without_embeddings:
        print(f"\n{user.username} ({user.role}):")
        print(f"  Face image: {user.face_image.name}")
        
        embedding = extract_face_embedding_from_image(user.face_image)
        
        if embedding:
            user.face_embedding = embedding
            user.save(update_fields=['face_embedding'])
            success_count += 1
            print(f"  ✅ Saved embedding")
        else:
            fail_count += 1
    
    print("\n" + "=" * 60)
    print("  RESULTS")
    print("=" * 60)
    print(f"Successfully processed: {success_count}")
    print(f"Failed: {fail_count}")
    print(f"Total: {users_without_embeddings.count()}")

if __name__ == '__main__':
    process_users()
