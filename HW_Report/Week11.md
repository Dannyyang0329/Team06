# Week11 Homework

## Docker Image 實作

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

### Django MTV 架構

1. **Model**
   - 定義了 `User`, `ChatRoom`, `Message` 等資料模型。
   - 使用 Django ORM 操作資料庫，提供資料的新增、查詢、更新與刪除功能。
   - `Message` 模型包含欄位：`sender`, `content`, `timestamp`，並支援訊息回覆與刪除。

2. **View**
   - 使用 Django 的 `views.py` 處理用戶請求。
   - `match_view`：處理用戶配對邏輯，返回配對結果。

3. **Template**
   - 使用 Django Template 語法動態渲染 HTML 頁面。
   - `index.html`：提供用戶進入點，包含個人檔案設定與偏好選擇。
   - `chat.html`：提供聊天室界面，包含訊息顯示與輸入框。
   - `preferences.html`：讓用戶設定聊天偏好，如性別與興趣標籤。

### Channels WebSocket 即時通訊（取代上課教的 socketio）
由於先前已使用 Channels 和 WebSocket 實作聊天室功能，經過我們研究發現要再改為使用 socketio 實屬不易，想重寫也遭遇許多實作問題，等於需要完全從頭寫起。

我們有嘗試過一次（見 [commit #eb0b38](https://github.com/Dannyyang0329/Team06/commit/eb0b387c420ed9d65d9196a4228bd340f26a5e95)），但發現無法執行，因為：

"andrewgodwin, on May 2, 2018:
Channels doesn't support socket.io - it's a different protocol that isn't websockets or HTTP but layers on top of them. You'll have to use a socket.io server if you want to use it."
(Ref: https://github.com/django/channels/issues/1038)



因此我們保留先前的 channels 實作，並分述如下：

1. **伺服器端實作**
   - 使用 `Django Channels` 提供 WebSocket 支援，實現雙向即時通訊。
   - 定義消費者（Consumers）：`MatchingConsumer` 負責用戶配對邏輯，`ChatConsumer` 處理聊天室訊息傳遞。
   - 使用 Redis 作為 Channel Layer，管理用戶群組與訊息分發。
   - 支援事件：
     - `connect`：用戶連接 WebSocket，加入對應群組。
     - `disconnect`：用戶斷開連接，從群組移除。
     - `send_message`：處理用戶發送的訊息，並廣播至聊天室內所有用戶。
     - `recall_message`：處理訊息收回，更新訊息狀態並通知群組。

2. **客戶端實作**
   - 使用原生 WebSocket API 與 Django Channels 通訊。
   - 監聽事件：
     - `new_message`：接收伺服器廣播的訊息，更新聊天內容。
     - `message_recalled`：處理訊息收回，更新 UI 顯示。
   - 發送事件：
     - `send_message`：將用戶輸入的訊息傳送至伺服器。
     - `recall_message`：通知伺服器收回指定訊息。

3. **整合與測試**
   - 測試多用戶即時通訊，確保訊息能正確傳遞與顯示。
   - 模擬用戶斷線與重連，檢查系統穩定性。
   - 驗證訊息收回功能，確保訊息狀態同步更新於所有用戶。

以上功能也可以使用 ```socketio``` 實作完成，未來若有需要可重新實作。

### Ajax
我們嘗試將先前只儲存在使用者 browswer 端的 local storage 的個人偏好選擇（偏好配對性別、1~3項可選擇興趣）使用 ajax 儲存到 server。

#### Frontend
前端使用 ajax 發送 POST request，並檢查 CSRF token 避免被阻擋。

```js/main.js```
```javascript
   // Use jQuery AJAX to save preferences
   savePreferencesBtn.addEventListener('click', function() {
      const genderRadio = document.querySelector(...);
      // ...

      // Use jQuery AJAX to send data to the server
      $.ajax({
         url: '/save-preferences/',
         type: 'POST',
         contentType: 'application/json',
         headers: {
               'X-CSRFToken': getCSRFToken() // Set CSRF token
         },
         data: JSON.stringify(userSettings),
         success: function(response) {
               alert('偏好設定已儲存！');
               preferencesModal.style.display = 'none';
         },
         error: function(xhr, status, error) {
               alert('儲存偏好設定時發生錯誤，請稍後再試。');
         }
      });
   });

   function getCSRFToken() {
      const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
      return csrfToken ? csrfToken.value : '';
   }
```

#### Backend
後端 Django 部分，於 ```webhw/view.py``` 中新增相關函式，並新增相關的 url：
```javascript
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
def save_preferences(request):
   if request.method == 'POST':
      try:
            data = json.loads(request.body)
            //...
            print("Received preferences:", data)
            return JsonResponse({'message': 'Preferences saved successfully!'}, status=200)
      except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
   return JsonResponse({'error': 'Invalid request method'}, status=405)
```
由於此處為 ajax 練習，且我們討論後匿名聊天沒有一定需要將偏好對應 ```user_id```，因此後續決定暫時不儲存，保留未來實作空間。

## 2. 額外找了與當週上課的主題相關的程式技術

### Django Channels
- 採用 Django Channels 提供 WebSocket 支援，實現即時通訊。
- 使用 Redis 作為 Channel Layer，提升訊息分發效率。


## 3. 組員分工情況

第6組：
* 賴佑寧 (25%): Django MVT architecture, WebSocket, Ajax
* 鄭宇彤 (25%): Django MVT architecture, WebSocket, Ajax
* 楊育勝 (25%): Django MVT architecture, WebSocket, Ajax
* 黃唯秩 (25%): Django MVT architecture, WebSocket, Ajax