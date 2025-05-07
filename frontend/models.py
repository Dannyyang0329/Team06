from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
import uuid

class UserManager(BaseUserManager):
    def create_user(self, user_id, password=None, **extra_fields):
        if not user_id:
            raise ValueError('使用者帳號為必填')
        user = self.model(user_id=user_id, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, user_id, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(user_id, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    """使用者模型"""
    user_id = models.CharField(primary_key=True, max_length=50, unique=True)
    nickname = models.CharField(max_length=50, default="匿名用戶")
    avatar = models.CharField(max_length=50, default="1")
    mood = models.CharField(max_length=20, default="neutral")
    gender = models.CharField(max_length=10, default="other")
    channel_name = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'user_id'
    REQUIRED_FIELDS = ['nickname']

    def __str__(self):
        return f"{self.nickname} ({self.user_id})"

class WaitingUser(models.Model):
    """等待配對的使用者"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    preferred_gender = models.CharField(max_length=10, default="all")  # 偏好性別
    tags = models.JSONField(default=list)  # 興趣標籤
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.nickname} (等待中)"

class ChatRoom(models.Model):
    """聊天室模型"""
    room_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # room_id = models.CharField(primary_key=True, default="", editable=False)
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_room_user1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_room_user2')
    active = models.BooleanField(default=True)  # 是否活躍
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"聊天室: {self.user1.nickname} & {self.user2.nickname}"

class Message(models.Model):
    """消息模型"""
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    replied_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    is_recalled = models.BooleanField(default=False)  # 是否被收回
    is_deleted_for_sender = models.BooleanField(default=False)  # 是否對發送者刪除
    is_deleted = models.BooleanField(default=False)  # 是否被刪除
    client_id = models.CharField(max_length=100, null=True, blank=True)  # 客戶端訊息ID
    sent_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender.nickname}: {self.content[:20]}..."

    class Meta:
        ordering = ['sent_at']

class Preference(models.Model):
    user_id = models.CharField(max_length=50, unique=True)
    preferred_gender = models.CharField(max_length=10, default="all")  # 偏好性別
    tags = models.JSONField(default=list)  # 興趣標籤

    def __str__(self):
        return f"Preference of User {self.user_id}"