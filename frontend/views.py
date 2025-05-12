from django.shortcuts import render, redirect
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework import status, serializers, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import RegisterSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'user_id'

    def validate(self, attrs):
        credentials = {
            'user_id': attrs.get('user_id'),
            'password': attrs.get('password')
        }

        user = authenticate(**credentials)
        if user:
            data = super().validate(attrs)
            data['user_id'] = user.user_id
            data['nickname'] = user.nickname
            return data
        else:
            raise serializers.ValidationError('無法使用提供的認證資訊登入')

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def login_page(self, request):
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

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def user_info(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({
                "message": "未登入",
                "is_authenticated": False
            }, status=200)
        return Response({
            "message": "您已通過認證",
            "user_id": user.user_id,
            "nickname": user.nickname,
            "is_authenticated": True
        })

    @action(detail=False, methods=['post'])
    def login(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken
        from django.contrib.auth import authenticate
        user_id = request.data.get('user_id')
        password = request.data.get('password')
        user = authenticate(request, user_id=user_id, password=password)
        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response({
                'token': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'user_id': user.user_id,
                'nickname': user.nickname
            })
        else:
            return Response({'detail': '帳號或密碼錯誤'}, status=401)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
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

@api_view(['GET'])
@permission_classes([AllowAny])
def index_view(request):
    return render(request, 'index.html')

@api_view(['GET'])
@permission_classes([AllowAny])
def chat_view(request):
    return render(request, 'chat.html')
