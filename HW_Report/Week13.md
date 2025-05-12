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

### JSON Web Token
我們使用 JWT 技術創建註冊、登入、登出功能：
1. 註冊功能：
    - 使用者透過前端表單提交註冊資訊（如帳號、密碼等）。
    - 後端接收請求後，使用 Django Rest Framework 的 `UserSerializer` 驗證資料。
    - 驗證成功後，創建新使用者並回傳成功訊息。

2. 登入功能：
    - 使用者提交帳號與密碼至後端。
    - 後端驗證帳號與密碼是否正確，若正確則生成 JWT Token。
    - Token 生成使用 `rest_framework_simplejwt` 套件，範例如下：
      ```python
      
      from rest_framework_simplejwt.tokens import RefreshToken

      def get_tokens_for_user(user):
            refresh = RefreshToken.for_user(user)
            return {
                 'refresh': str(refresh),
                 'access': str(refresh.access_token),
            }
      ```
    - 回傳 Token 至前端，前端將 Token 儲存於 Local Storage 或 Cookie 中。

3. 登出功能：
    - 使用者登出時，前端刪除儲存的 Token。
    - 後端可選擇將 Token 加入黑名單（需啟用 `Blacklist` 功能），範例如下：
      ```python
      from rest_framework_simplejwt.tokens import RefreshToken

      def blacklist_token(refresh_token):
            token = RefreshToken(refresh_token)
            token.blacklist()
      ```

4. Token 驗證：
    - 每次前端發送 API 請求時，將 `Authorization` 標頭設為 `Bearer [access_token]`。
    - 後端使用 `JWTAuthentication` 驗證 Token 的有效性，若無效則回傳 401 Unauthorized。

5. Token 更新：
    - 當 Access Token 過期時，前端可使用 Refresh Token 請求新的 Access Token。
    - 範例如下：
      ```python
      POST /api/token/refresh/
      {
            "refresh": "your_refresh_token"
      }
      ```
    - 後端回傳新的 Access Token，前端更新儲存的 Token。

此流程確保了使用者的身份驗證安全性，同時提供了良好的使用體驗。

### API 串接: Gemini

## 2. 額外找了與當週上課的主題相關的程式技術

### python-dotenv
為了使執行此份repo的使用者能輸入自己的 google gemini api key，我們在目錄底下新增 `.env` 檔案，供使用者貼上 key。

當啟動 django backend 時，透過 `python-dotenv` 這個套件能

## 3. 組員分工情況

第6組：
* 賴佑寧 (25%): Django Rest Framework, JWT,  Gemini API
* 鄭宇彤 (25%): Django Rest Framework, JWT,  Gemini API
* 楊育勝 (25%): Django Rest Framework, JWT,  Gemini API
* 黃唯秩 (25%): Django Rest Framework, JWT,  Gemini API