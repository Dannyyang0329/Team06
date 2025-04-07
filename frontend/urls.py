from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),  # URL pattern for the index view
    path('chat/', views.chat, name='chat'),  # URL pattern for the chat view
]