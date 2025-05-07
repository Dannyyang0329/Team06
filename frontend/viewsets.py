from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import render, redirect
from .models import User, ChatRoom, Message, Preference
from .serializers import UserSerializer, ChatRoomSerializer, MessageSerializer, PreferenceSerializer, RegisterSerializer

class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def login_page(self, request):
        if request.user.is_authenticated:
            return redirect('/')
        return render(request, 'login.html')

    @action(detail=False, methods=['get'])
    def register_page(self, request):
        return render(request, 'register.html')

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'detail': '註冊成功',
                'token': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({"error": "Refresh token is required"}, status=400)
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response({
                "success": True,
                "message": "您已成功登出",
                "status": "Token has been blacklisted"
            })
        except Exception as e:
            return Response({
                "success": False,
                "error": str(e),
                "message": "登出時發生錯誤"
            }, status=400)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def user_info(self, request):
        return Response({
            "message": "您已通過認證",
            "user_id": request.user.user_id,
            "nickname": request.user.nickname
        })

    @action(detail=False, methods=['post'])
    def refresh_token(self, request):
        refresh = RefreshToken(request.data.get('refresh'))
        return Response({
            'access': str(refresh.access_token),
        })

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class ChatRoomViewSet(viewsets.ModelViewSet):
    queryset = ChatRoom.objects.all()
    serializer_class = ChatRoomSerializer

class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer

class PreferenceViewSet(viewsets.ModelViewSet):
    queryset = Preference.objects.all()
    serializer_class = PreferenceSerializer