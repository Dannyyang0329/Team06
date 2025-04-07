# Week07 Homework

## 0. Docker Image 實作

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

### Django

1. **用戶配對邏輯**
   - 使用 Redis 儲存等待配對的用戶清單（`waiting_users`）與匹配鎖（`matching_lock`）以防止重複匹配。
   - 用戶發送 `start_matching` 動作後，後端將其資料儲存並進行配對。
   - 成功配對後建立聊天室（UUID 為 room_id），並由雙方 WebSocket 接收 `match_found` 事件，轉跳聊天室。

2. **WebSocket 即時通訊**
   - 使用 `Django Channels` 搭配 `Daphne` 實作雙向即時聊天。
   - 分為兩個主要的 `AsyncWebsocketConsumer`：`MatchingConsumer` 負責配對、`ChatConsumer` 處理聊天室邏輯與訊息傳遞。

3. **訊息儲存與回覆機制**
   - 訊息含有 `sender`、`replied_to`、`client_id` 等欄位，並儲存於 `Message` 模型。
   - 支援訊息「收回」、「刪除」、「回覆顯示」功能，並透過 `group_send` 廣播給聊天室內所有人。
   - 提供 `get_replied_message_info()` 方法安全取出回覆資訊。

4. **聊天室管理與離開行為**
   - 當任一使用者選擇離開聊天室，後端會將聊天室設為 `active=False`，並通知對方 `user_left`。
   - 聊天室資料存在 `ChatRoom` 模型，包含 `user1`, `user2`, `room_id`, `active` 狀態。

5. **資料模型設計**
   - 使用 `models.py` 定義資料結構，如 `User`, `WaitingUser`, `ChatRoom`, `Message`。
   - 包含多對一（User → Message），一對一（User → WaitingUser），並使用 JSONField 儲存興趣標籤。

### SQLite 資料庫（db.sqlite3）

- 本專案使用 Django 預設的 SQLite 作為本地開發資料庫，儲存所有用戶、聊天室與訊息資料。
- 所有資料模型（如 `User`, `ChatRoom`, `Message`）皆透過 Django ORM 操作，對應到 `db.sqlite3` 中的資料表。
- 執行 `python manage.py migrate` 時會根據 `models.py` 自動建立資料表結構。
- 優點是輕量、免安裝，可快速在本地或 Docker 環境中測試開發。
- 未來若部署至正式環境，建議改用 PostgreSQL 以支援高並發與穩定性。

### Docker

1. **Dockerfile 與建置環境**
   - 使用 `python:3.10-slim` 為基底映像，設定 `WORKDIR /app`，安裝 `requirements.txt` 套件。
   - 執行 `run_server.py` 啟動 Daphne server，整合 Django 與 WebSocket。

2. **Docker Compose 編排多服務**
   - `docker-compose.yml` 中定義 `web` 與 `redis`：
     - `web`: 使用建置中的映像，掛載本機目錄到容器，暴露 `8000:8000`。
     - `redis`: 使用 `redis:6` 映像，提供 Channel Layer 支援。

3. **Docker Hub 映像管理**
   - 使用 `docker build` 建立映像，並標記為 `yuunnn/team06-web:week07`。
   - 使用 `docker push` 將映像推送至 Docker Hub，讓他人可拉取測試。

4. **熱重載與開發效率**
   - 透過 volume 掛載方式確保程式碼更新能即時反映。
   - 使用 Daphne 作為開發與部署用伺服器，支援 HTTP 與 WebSocket。



## 2. 額外找了與當週上課的主題相關的程式技術

### WebSocket 實作：Daphne + Redis

- 使用 `channels_redis` 提供的 Channel Layer 實現 Redis-based 群組通訊。
- 設定於 `settings.py`：
  ```python
  CHANNEL_LAYERS = {
      "default": {
          "BACKEND": "channels_redis.core.RedisChannelLayer",
          "CONFIG": {
              "hosts": [("redis", 6379)],
          },
      },
  }
  ASGI_APPLICATION = "webhw.asgi.application"
  ```
- Redis 分發機制提供高效的即時訊息推播架構。
- 專案透過 `docker-compose.yml` 將 Redis 一併容器化，避免需額外安裝 Redis 伺服器。
- Redis 被定義為獨立服務，供 Django Channels 作為 Channel Layer 背後的訊息代理。使用方式：(```docker-compose.yml```)
  ```yaml
  services:
    redis:
      image: redis:6
      ports:
        - "6379:6379"

### Django 靜態檔案管理：whitenoise

- 加入 `whitenoise.middleware.WhiteNoiseMiddleware` 讓 Django 可在不使用 Nginx 的情況下提供靜態資源。
- 在 `run_server.py` 啟動前執行 `collectstatic`，確保靜態檔案完整提供。


## 3. 組員分工情況

第6組：
* 賴佑寧 (25%): Django, Docker, Redis, WebSocket 測試
* 鄭宇彤 (25%): Django, Docker, Redis, WebSocket 測試
* 楊育勝 (25%): Django, Docker, Redis, WebSocket 測試
* 黃唯秩 (25%): Django, Docker, Redis, WebSocket 測試