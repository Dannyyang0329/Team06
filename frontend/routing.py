from django.urls import re_path

# 延遲匯入消費者以避免循環匯入問題
def get_chat_consumer():
    from .consumers import ChatConsumer
    return ChatConsumer.as_asgi()

def get_matching_consumer():
    from .consumers import MatchingConsumer
    return MatchingConsumer.as_asgi()

# 定義WebSocket路由模式
websocket_urlpatterns = [
    re_path(r'ws/chat/$', get_chat_consumer()),
    re_path(r'ws/chat/(?P<room>[^/]+)/$', get_chat_consumer()),
    re_path(r'ws/matching/$', get_matching_consumer()),
]
