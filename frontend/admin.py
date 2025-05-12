from django.contrib import admin
from .models import User, ChatRoom, Message, Preference

# Register your models here.
admin.site.register(User)
admin.site.register(ChatRoom)
admin.site.register(Message)
admin.site.register(Preference)
