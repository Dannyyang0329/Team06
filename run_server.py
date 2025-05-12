#!/usr/bin/env python
import os
import sys
import subprocess
import time
import socket
import logging
from dotenv import load_dotenv

# 設置 Django 環境變數 - 在任何 Django 相關導入前設置
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webhw.settings')

# 設置日誌
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def check_dependency(package):
    """檢查依賴是否已安裝"""
    try:
        __import__(package)
        return True
    except ImportError:
        return False

def install_requirements():
    """安裝所需依賴"""
    logger.info("安裝所需依賴...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

def run_migrations():
    """執行資料庫遷移"""
    logger.info("執行資料庫遷移...")
    try:
        subprocess.run([sys.executable, "manage.py", "makemigrations"], check=True)
        subprocess.run([sys.executable, "manage.py", "migrate"], check=True)
        logger.info("資料庫遷移成功!")
    except subprocess.CalledProcessError:
        logger.warning("警告: 資料庫遷移失敗，但仍將嘗試啟動伺服器。")

def check_redis():
    """檢查Redis服務是否運行"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)
        s.connect(('127.0.0.1', 6379))
        s.close()
        logger.info("Redis服務正在運行")
        return True
    except (socket.error, socket.timeout):
        logger.error("Redis服務未運行，請啟動Redis")
        return False

def run_collectstatic():
    """收集靜態檔案"""
    logger.info("收集靜態檔案...")
    try:
        subprocess.run([sys.executable, "manage.py", "collectstatic", "--noinput"], check=True)
        logger.info("靜態檔案收集成功!")
    except subprocess.CalledProcessError:
        logger.warning("警告: 靜態檔案收集失敗，可能會影響網站外觀。")

def start_daphne():
    """啟動Daphne ASGI伺服器"""
    logger.info("\n啟動Daphne ASGI伺服器...")
    logger.info("訪問網站: http://localhost:8000")
    logger.info("按 Ctrl+C 可停止伺服器")
    logger.info("="*50)
    try:
        subprocess.run(["daphne", "-b", "0.0.0.0", "-p", "8000", "webhw.asgi:application"])
    except KeyboardInterrupt:
        logger.info("\n伺服器已停止")
    except Exception as e:
        logger.error(f"啟動伺服器時發生錯誤: {e}")
        sys.exit(1)

def main():
    print("="*50)
    print("秘語聊天室 - WebSocket伺服器啟動腳本")
    print("="*50)
    
    # 步驟1: 檢查環境
    logger.info("\n步驟1: 檢查環境...")
    
    # 檢查Python版本
    python_version = sys.version_info
    logger.info(f"Python版本: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    # 檢查必要依賴
    if not check_dependency("daphne") or not check_dependency("channels") or not check_dependency("channels_redis"):
        logger.info("未檢測到必要依賴，正在安裝...")
        install_requirements()
        
        # 再次檢查安裝是否成功
        if not check_dependency("daphne") or not check_dependency("channels") or not check_dependency("channels_redis"):
            logger.error("依賴安裝失敗，請手動安裝依賴")
            logger.info("pip install -r requirements.txt")
            sys.exit(1)
    else:
        import daphne
        import channels
        import channels_redis
        logger.info(f"Daphne版本: {daphne.__version__}")
        logger.info(f"Channels版本: {channels.__version__}")
    
    # 步驟2: 檢查Redis
    logger.info("\n步驟2: 檢查Redis服務...")
    if not check_redis():
        logger.error("Redis未運行，請先啟動Redis")
        logger.info("Linux/macOS: redis-server")
        logger.info("Windows: 啟動Redis服務或運行redis-server.exe")
        
        # choice = input("是否仍要繼續? [y/N]: ")
        # if choice.lower() != 'y':
        #     sys.exit(1)
    
    # 步驟3: 執行資料庫遷移
    logger.info("\n步驟3: 執行資料庫遷移...")
    run_migrations()
    
    # 步驟4: 收集靜態檔案
    logger.info("\n步驟4: 收集靜態檔案...")
    run_collectstatic()

    load_dotenv()
    api_key = os.getenv('GEMINI_API_KEY')
    logger.info(f"Gemini API Key: {api_key}")

    # 步驟5: 啟動伺服器 (原本的步驟4)
    start_daphne()


if __name__ == "__main__":
    main()
