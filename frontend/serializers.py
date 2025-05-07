from rest_framework import serializers
from django.apps import apps

User = apps.get_model('frontend', 'User')
ChatRoom = apps.get_model('frontend', 'ChatRoom')
Message = apps.get_model('frontend', 'Message')
Preference = apps.get_model('frontend', 'Preference')

class RegisterSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['user_id', 'nickname', 'password', 'password2', 'gender', 'mood', 'avatar']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError('兩次密碼輸入不相同')
        return data

    def create(self, validated_data):
        validated_data.pop('password2')  # Remove password2 before creating user
        user = User.objects.create_user(**validated_data)
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'
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