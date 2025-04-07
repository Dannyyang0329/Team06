from django.db import models
import uuid

class User(models.Model):
    """使用者模型"""
    user_id = models.CharField(primary_key=True, max_length=50)
    nickname = models.CharField(max_length=50, default="匿名用戶")
    avatar = models.CharField(max_length=50, default="1")  # 頭像編號
    mood = models.CharField(max_length=20, default="neutral")  # 心情
    gender = models.CharField(max_length=10, default="other")  # 性別
    channel_name = models.CharField(max_length=100, null=True, blank=True)  # WebSocket通道名稱
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)

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
