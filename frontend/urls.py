from django.urls import path
from . import views

urlpatterns = [
    path('chat/', views.chat_view, name='chat'),  # URL pattern for the chat view
]