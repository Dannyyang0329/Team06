from rest_framework import serializers
from django.apps import apps

User = apps.get_model('frontend', 'User')
ChatRoom = apps.get_model('frontend', 'ChatRoom')
Message = apps.get_model('frontend', 'Message')
Preference = apps.get_model('frontend', 'Preference')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    password2 = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['user_id', 'nickname', 'password', 'password2', 'gender', 'mood', 'avatar']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, data):
        pw1 = data.get('password')
        pw2 = data.get('password2')
        if pw1 or pw2:
            if pw1 != pw2:
                raise serializers.ValidationError('兩次密碼輸入不相同')
        return data

    def create(self, validated_data):
        import random, string
        password = validated_data.pop('password', None)
        validated_data.pop('password2', None)
        if not password:
            # 匿名用戶自動產生隨機密碼
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        user = User.objects.create_user(password=password, **validated_data)
        return user

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(required=False)  # Make password optional
    
    class Meta:
        model = User
        fields = ['user_id', 'nickname', 'avatar', 'mood', 'gender', 'channel_name', 'password']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},  # Ensure password is write-only and optional
        }
    def create(self, validated_data):
        instance = super().create(validated_data)
        print(f"User created: {instance}")
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        print(f"User updated: {instance}")
        return instance


class ChatRoomSerializer(serializers.ModelSerializer):
    room_id = serializers.UUIDField(format='hex')
    
    class Meta:
        model = ChatRoom
        fields = '__all__'
    def create(self, validated_data):
        instance = super().create(validated_data)
        print(f"ChatRoom created: {instance}")
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        print(f"ChatRoom updated: {instance}")
        return instance


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = '__all__'
    def create(self, validated_data):
        instance = super().create(validated_data)
        print(f"Message created: {instance}")
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        print(f"Message updated: {instance}")
        return instance


class PreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Preference
        fields = '__all__'