"""
URL configuration for webhw project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from frontend.viewsets import UserViewSet, ChatRoomViewSet, MessageViewSet, PreferenceViewSet
from frontend.views import index_view, CustomTokenObtainPairView, LogoutView, AuthViewSet
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'chatrooms', ChatRoomViewSet)
router.register(r'messages', MessageViewSet)
router.register(r'preferences', PreferenceViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/register/', AuthViewSet.as_view({'post': 'register'}), name='register'),
    path('api/auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('api/auth/user/', AuthViewSet.as_view({'get': 'user_info'}), name='user_info'),
    path('api/auth/login/', AuthViewSet.as_view({'post': 'login'}), name='auth_login'),
    path('login/', AuthViewSet.as_view({'get': 'login_page'}), name='login'),
    path('register/', AuthViewSet.as_view({'get': 'register_page'}), name='register'),
    path('', index_view, name='index'),
    path('', include("frontend.urls")),
]

urlpatterns += router.urls
