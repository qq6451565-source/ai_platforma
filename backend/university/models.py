from django.db import models


class Campus(models.Model):
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=255, blank=True, default="")

    def __str__(self):
        return self.name


class Faculty(models.Model):
    name = models.CharField(max_length=255)
    campus = models.ForeignKey(Campus, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.name


class Department(models.Model):
    name = models.CharField(max_length=255)
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE)

    def __str__(self):
        return self.name


class Degree(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name


class StudyMode(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name
