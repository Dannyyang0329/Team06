# Week05 Homework

## 1. 練習了哪些當週上課的主題
## 2. 額外找了與當週上課的主題相關的程式技術
## 3. 組員分工情況

第6組：
* 賴佑寧 (25%): HTML, CSS, Javascript, UI/UX
* 鄭宇彤 (25%): HTML, CSS, Javascript, UI/UX 
* 楊育勝 (25%): HTML, CSS, Javascript, UI/UX
* 黃唯秩 (25%): HTML, CSS, Javascript, UI/UX

## main.js - 使用者設定與匹配系統

### 1. 頁面加載與初始化
- `DOMContentLoaded` 事件監聽：確保 DOM 元素載入後執行初始化。
- `loadUserSettings()`：從 `localStorage` 載入使用者設定，應用已保存的頭像、暱稱、心情等。
- `saveUserSettings()`：將當前使用者設定存入 `localStorage`。

### 2. 用戶設定模態框
- 點擊 `setProfileBtn` 顯示 `profile-modal`。
- 點擊 `closeProfileBtn` 關閉 `profile-modal`。
- 點擊 `saveProfileBtn` 保存使用者設定，確保填寫完整並開始匹配。
- 允許使用者選擇頭像 (`avatarOptions`)、心情 (`moodOptions`)、性別 (`genderOptions`)。

### 3. 匹配系統
- `matchingScreen`：匹配界面顯示。
- `setTimeout()` 模擬 2-5 秒的匹配過程後跳轉至 `chat.html`。
- `cancelMatchingBtn` 可取消匹配並返回。

### 4. 模擬在線用戶數據
- `simulateOnlineUsers()`：隨機生成在線用戶數與聊天數，每 30 秒更新。

### 5. 偏好設定
- 點擊 `setPreferencesBtn` 顯示 `preferences-modal`。
- `savePreferencesBtn` 保存性別偏好 (`preferredGender`) 和標籤 (`tags`)。
- `closePreferencesBtn` 可關閉模態框。

### 6. 其他功能
- `showGuideBtn` 顯示 `guide-modal`，`closeGuideBtn` 可關閉。
- 監聽 `click` 事件，點擊模態框外部可關閉。

---

## chat.js - 即時聊天系統

### 1. 頁面初始化與用戶資訊
- `DOMContentLoaded` 事件監聽：初始化聊天功能。
- 從 `localStorage` 載入使用者暱稱與頭像，顯示於聊天界面。
- 移除 `typingIndicator`（打字指示器）以備後續顯示。

### 2. 發送訊息
- `sendMessage()`：
  - 獲取當前時間，格式化為 `HH:MM`。
  - 檢查是否為回覆訊息 (`reply-to`)。
  - 建立 `messageEl` 元素，插入 `messagesContainer`。
  - 綁定回覆 (`reply-button`)、收回 (`recall-button`)、刪除 (`delete-button`) 事件。
  - 自動滾動至最新訊息。

### 3. 訊息操作功能
- `replyToMessage()`：允許回覆對方或自己的訊息，顯示回覆預覽。
- `recallMessage()`：訊息可被收回，內容變更為「此訊息已收回」。
- `deleteMessage()`：訊息可被刪除，移除對應 `messageEl`。

### 4. 模擬對方回覆
- `simulateReply()`：
  - 顯示 `typingIndicator`，模擬打字狀態 1-3 秒。
  - 以隨機訊息回覆，可能回覆最新的使用者訊息。
  - 回覆後綁定 `reply-button` 供用戶回覆對方。

### 5. 聊天切換與結束
- `nextChat()`：
  - 顯示「正在尋找新對象」系統訊息。
  - 1-2 秒後清空聊天紀錄，顯示新對話對象。
  - 模擬對方發送第一句話。
- `endChat()`：確認後結束聊天並返回 `main.html`。

### 6. 其他互動
- `Enter` 鍵發送訊息 (`messageInput.addEventListener('keypress')`)。
- 自動調整輸入框高度 (`input` 事件監聽 `messageInput`)。
- `resetTextareaHeight()` 確保最大高度限制為 120px。
- `initExistingMessages()`：為現有訊息綁定回覆按鈕事件。

## 新增 React 組件 - MessageHeader
- `MessageHeader({ userSettings })`：
  - 使用 `React.createElement` 動態創建訊息頭部元件。
  - 顯示用戶頭像 (`userSettings.avatar`)，若無則預設為 `avatar1.png`。
  - 顯示用戶暱稱 (`userSettings.nickname`)，若無則預設為「你」。
  - 提高組件化管理，使訊息頭部可重複使用。
