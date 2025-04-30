from django.urls import re_path
from . import consumers

# WebSocket URL路由配置
websocket_urlpatterns = [
    re_path(r'ws/chat/$', consumers.ChatConsumer.as_asgi()),
    re_path(r'ws/matching/$', consumers.MatchingConsumer.as_asgi()),
]

# Socket.IO路由由asgi.py中的socketio.ASGIApp處理
