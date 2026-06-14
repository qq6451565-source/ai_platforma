from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from tests_app.permissions import IsAdmin

from .models import Lesson
from .serializers import LessonSerializer


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "student":
            group_id = getattr(user, "group_id", None)
            if group_id:
                qs = qs.filter(group_id=group_id)
            else:
                return qs.none()
        if role == "teacher":
            qs = qs.filter(teacher_subject__teacher=user)
        return qs.order_by("start_time")

    @action(detail=True, methods=['post'], url_path='delivery-mode')
    def set_delivery_mode(self, request, pk=None):
        """O'qituvchi tomonidan dars rejimini tanlash (live yoki video)"""
        lesson = self.get_object()
        
        # Sifatliroq himoya: Faqat o'zining darsi yoki admin ekanligini get_queryset hal qiladi.
        # Role o'qituvchi bo'lmasa ruxsat etilmaydimi? get_queryset orqali faqat o'z darslari keladi.
        
        lesson_type = request.data.get('lesson_type')
        if lesson_type not in [c[0] for c in Lesson.LESSON_TYPES]:
            return Response({'detail': "Noto'g'ri lesson_type format."}, status=status.HTTP_400_BAD_REQUEST)
        
        lesson.lesson_type = lesson_type
        
        video_material_id = request.data.get('video_material_id')
        if lesson_type == 'video' and video_material_id:
            lesson.video_material_id = video_material_id
        elif lesson_type != 'video':
            lesson.video_material = None
            
        lesson.save()
        serializer = self.get_serializer(lesson)
        return Response(serializer.data)
