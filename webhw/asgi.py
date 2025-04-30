"""
ASGI config for webhw project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
import socketio
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webhw.settings')
django.setup()

# 初始化Django ASGI應用
django_asgi_app = get_asgi_application()

# 導入Socket.IO事件處理器
from frontend.socketio_handlers import sio

# 創建ASGI應用
application = socketio.ASGIApp(
    sio,
    django_asgi_app,
    socketio_path="socket.io"
)
