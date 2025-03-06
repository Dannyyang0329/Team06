# Week3 Homework

## HTML
### 1. `index.html`
* 基本結構標籤：<!DOCTYPE html>, <html>, <head>, <body>，定義 HTML 文件的基本結構。
* Metadata 標籤：<meta charset="UTF-8">（設定字元編碼）, <meta name="viewport" ...>（設定 viewport，用於響應式設計）。
* 標題標籤：<title>，設定頁面標題。
* 連結標籤：<link rel="stylesheet" ...>，引入外部 CSS 樣式表。
* 容器標籤：<div>，用於組織和區分內容區塊。
* 標題標籤：使用 <h1> 建立最大的標題
* 段落標籤：<p>，用於顯示文字段落。
* 按鈕標籤：<button>，建立可點擊的按鈕。

### 2. `chat.html`
* 輸入標籤：<input type="radio" ...>，建立單選按鈕。
* 文字區域標籤：<textarea>，建立可以讓使用者傳訊息的框框。
* i 標籤：<i>，用來顯示一個圖標，這是因為我們設定了特定的 class 屬性。

### 3. `preferences.html`
* 標籤：<label>，為表單元素提供標籤。
* Span 標籤：<span>，用於行內文字或元素的樣式設定或標記。



## CSS

### 1. 基礎設置重置

使用通用選擇器 (*) 重置 margin、padding 和 box-sizing，確保跨瀏覽器的一致性。

### 2. 字體設置

設置全局字體、背景顏色和文字顏色。如下方這樣：

```css
body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background-color: #f5f5f5;
    color: #333;
    line-height: 1.6;
    height: 100vh;
    overflow: hidden;
}
```

### 3. Flexbox 佈局

使用 Flexbox 來創建靈活且響應迅速的佈局。像下面這樣：

```css
.welcome-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 20px;
    text-align: center;
    background-color: white;
    position: absolute;
    width: 100%;
    top: 0;
    left: 0;
    z-index: 10;
}
```

### 4. 圓角和陰影

使用 border-radius 為元素添加圓角，使用 box-shadow 創建陰影效果。具體在我們的`chat-container`這個class裡面有設定。

```css
.chat-container {
    width: 95vw;
    max-width: 1000px;
    height: 90vh;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
```

### 5. 過渡效果

使用 transition 為元素的狀態變化添加平滑的過渡效果，讓我們的頁面看起來更加美觀。

```css
.btn-primary, .btn-secondary, .btn-next, .btn-end, .btn-send {
    cursor: pointer;
    border: none;
    border-radius: 50px;
    font-weight: 600;
    transition: all 0.2s ease;
    outline: none;
}

.btn-primary:hover {
    background-color: #2980b9;
    transform: translateY(-2px);
}
```

### 6. Pseudo-selectors

使用偽類選擇器（例如 :hover 和 :focus）來定義元素在特定狀態下的樣式。

```css
#message-input:focus {
    border-color: #3498db;
}

.btn-send:hover {
    background-color: #2980b9;
}
```


### 7.  動畫效果

使用 @keyframes 創建動畫，例如 typing 動畫。這樣會讓我們的聊天室看起來更加生動。

```css
.typing-indicator span {
    display: inline-block;
    width: 8px;
    height: 8px;
    background-color: #999;
    border-radius: 50%;
    margin: 0 2px;
    animation: typing 1.4s infinite both;
}

@keyframes typing {
    0% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
    100% { transform: translateY(0); }
}
```

### 8. RGBA 顏色

使用 RGBA 顏色值來創建具有透明度的顏色。


### 9. 響應式設計

使用媒體查詢 (@media) 針對不同螢幕尺寸調整佈局和元素大小。