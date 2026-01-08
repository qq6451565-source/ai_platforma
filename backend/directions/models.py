from django.db import models

class Direction(models.Model):
    name = models.CharField(max_length=200)
    language = models.CharField(max_length=5, choices=[
        ('uz', 'Uzbek'),
        ('ru', 'Russian'),
        ('en', 'English')
    ])
    degree = models.CharField(max_length=20, default='bachelor')

    def __str__(self):
        return self.name
