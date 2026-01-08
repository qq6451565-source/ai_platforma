# from django.urls import re_path
# from .consumers import LiveLessonConsumer

# websocket_urlpatterns = [
#     re_path(r"ws/live/(?P<room>[\w\-]+)/$", LiveLessonConsumer.as_asgi()),
# ]


from django.urls import path
from .consumers import LiveLessonConsumer

websocket_urlpatterns = [
    path("ws/live/<str:room_id>/", LiveLessonConsumer.as_asgi()),
]
