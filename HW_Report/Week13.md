# Week13 Homework

## Docker Image

Docker Hub 連結：

https://hub.docker.com/r/yuunnn/team06-web


Pull 指令：

```bash
docker pull yuunnn/team06-web:week07
```

Docker 啟動方式說明：
```bash
git clone https://github.com/Dannyyang0329/Team06.git
cd Team06

docker-compose up
```

預設網站：

http://localhost:8000

## 1. 練習了哪些當週上課的主題

### Django Rest Framework
1. 設定 settings.py
    (1) 在 ```INSTALLED_APPS``` 中加入 ```"rest_framework"```
    (2) 加入 ```REST_FRAMEWORK```

2. Serializers: serializers.py
為 models.py 中每個 model 設定一個新的 serializer。

3. 整合 serializer 於 consumer.py 程式邏輯中：
由於我們使用 websocket，因此很多物件的建立並不是使用 API GET/POST，而是直接使用 ```[Model].objects.create()```如下：
```python
from .model import User
user, created = User.objects.update_or_create(
    user_id=user_id,
    defaults={
        'nickname': nickname,
        'avatar': avatar,
        'mood': mood,
        'gender': gender,
        'channel_name': channel_name
    }
)
```
舊有寫法的缺點是，如果傳入一整個dictionary，需要逐個item寫下。利用serializer，我們可以直接用：
```python
from .serializers import UserSerializer

serializer = UserSerializer(data=user_data)            
if serializer.is_valid():
    # 條件檢查寫這裡，例如檢查 user_id 是否存在
    user = serializer.save()
    return user
else:
    logger.error(f"Invalid user data: {serializer.errors}")
    raise ValueError(f"Invalid user data: {serializer.errors}")
```
還可以順便檢查欄位。
