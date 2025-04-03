#!/usr/bin/env python
import os
import sys

if __name__ == "__main__":
    print("="*50)
    print("秘語聊天室 - Django 開發伺服器啟動腳本")
    print("="*50)
    print("\n注意: 此方法僅供開發使用，不支援 WebSocket 功能")
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webhw.settings')
    
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    
    execute_from_command_line(['manage.py', 'runserver', '0.0.0.0:8000'])
