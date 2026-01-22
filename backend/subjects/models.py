from django.db import models
from directions.models import Direction

class Subject(models.Model):
    name = models.CharField(max_length=200)
    directions = models.ManyToManyField(Direction, related_name="subjects")

    def __str__(self):
        return self.name
