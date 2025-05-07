from rest_framework import serializers
from django.apps import apps

User = apps.get_model('frontend', 'User')
ChatRoom = apps.get_model('frontend', 'ChatRoom')
Message = apps.get_model('frontend', 'Message')
Preference = apps.get_model('frontend', 'Preference')

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