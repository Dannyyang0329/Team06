"""
ASGI config for webhw project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
import frontend.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webhw.settings')

# 初始化Django ASGI應用
django_asgi_app = get_asgi_application()

# 設定ASGI應用
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                frontend.routing.websocket_urlpatterns
            )
        )
    ),
})
