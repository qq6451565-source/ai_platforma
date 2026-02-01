from django.core.management.base import BaseCommand
from django.utils import timezone

from live.tasks import sync_live_rooms


class Command(BaseCommand):
    help = "Dars vaqtiga qarab live xonalarni avtomatik yaratadi/yopadi."

    def handle(self, *args, **options):
        now = timezone.now()
        result = sync_live_rooms(now=now)
        self.stdout.write(
            self.style.SUCCESS(
                f"Live xonalar sinxron: created={result['created']} "
                f"activated={result['activated']} closed={result['closed']}"
            )
        )
