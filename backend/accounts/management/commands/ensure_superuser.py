import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Ensure a superuser exists based on environment variables."

    def handle(self, *args, **options):
        enabled = os.getenv("AUTO_CREATE_SUPERUSER", "").strip().lower() in {"1", "true", "yes"}
        if not enabled:
            self.stdout.write("AUTO_CREATE_SUPERUSER not enabled; skipping.")
            return

        username = os.getenv("DJANGO_SUPERUSER_USERNAME")
        password = os.getenv("DJANGO_SUPERUSER_PASSWORD")
        email = os.getenv("DJANGO_SUPERUSER_EMAIL", "")
        role = os.getenv("DJANGO_SUPERUSER_ROLE", "admin")

        if not username or not password:
            self.stderr.write("DJANGO_SUPERUSER_USERNAME/PASSWORD not set; skipping.")
            return

        User = get_user_model()
        existing = User.objects.filter(username=username).first()
        if existing:
            if role and getattr(existing, "role", None) != role:
                existing.role = role
                existing.save(update_fields=["role"])
            self.stdout.write("Superuser already exists; skipping.")
            return

        user = User.objects.create_superuser(username=username, email=email, password=password)
        if role and hasattr(user, "role"):
            user.role = role
            user.save(update_fields=["role"])
        self.stdout.write("Superuser created.")
