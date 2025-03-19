document.addEventListener('DOMContentLoaded', function() {
    // 獲取DOM元素
    const messagesContainer = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-message');
    const nextChatButton = document.getElementById('next-chat');
    const endChatButton = document.getElementById('end-chat');
    const typingIndicator = document.querySelector('.typing-indicator');
    
    // 從localStorage中獲取用戶設置
    const userSettings = JSON.parse(localStorage.getItem('userSettings')) || {};

    // 更新用戶資訊顯示
    if (userSettings.nickname) {
        document.getElementById('user-nickname').innerText = userSettings.nickname;
    }
    if (userSettings.avatar) {
        document.getElementById('user-avatar').src = `images/avatar${userSettings.avatar}.png`;
    }

    // 從DOM中移除打字指示器，稍後會在需要時將其添加到適當的位置
    if (typingIndicator && typingIndicator.parentNode) {
        typingIndicator.parentNode.removeChild(typingIndicator);
    }
    
    // 發送訊息函數
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            // 獲取當前時間
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const timeString = `${hours}:${minutes}`;
            
            // 檢查是否為回覆訊息
            const replyToId = messageInput.getAttribute('data-reply-to');
            const repliedTo = messageInput.getAttribute('data-replied-to');
            let repliedContent = '';
            let isReplyToStranger = false;
            
            if (replyToId) {
                const repliedMessage = document.getElementById(replyToId);
                if (repliedMessage) {
                    repliedContent = repliedMessage.querySelector('.message-content p').textContent;
                    // 確認是回覆自己還是對方
                    isReplyToStranger = repliedMessage.classList.contains('stranger');
                }
            }
            
            // 創建新的訊息元素
            const messageEl = document.createElement('div');
            messageEl.classList.add('message', 'self');
            
            // 生成唯一ID用於識別訊息
            const messageId = 'msg-' + Date.now();
            messageEl.id = messageId;
            
            // 構建消息HTML，包括回覆部分(如果有)
            let messageHTML = `
                <div class="message-header">
                    <img src="${userSettings.avatar ? 'images/avatar' + userSettings.avatar + '.png' : 'images/avatar1.png'}" class="message-avatar">
                    <span class="message-nickname">${userSettings.nickname || '你'}</span>
                </div>
                <div class="message-content">
            `;
            
            // 如果是回覆訊息，添加回覆部分，並根據回覆對象添加不同的類別
            if (replyToId && repliedContent) {
                // const replyClass = isReplyToStranger ? 'replied-message-stranger' : 'replied-message-self';
                // messageHTML += `
                //     <div class="replied-message ${replyClass}" data-original-msg="${replyToId}">
                //         <div class="replied-to">回覆給 ${repliedTo}</div>
                //         ${repliedContent.length > 50 ? repliedContent.substring(0, 50) + '...' : repliedContent}
                //     </div>
                // `;
                messageHTML += `
                    <div class="replied-message" data-original-msg="${replyToId}">
                        <div class="replied-to">回覆給 ${repliedTo}</div>
                        ${repliedContent.length > 50 ? repliedContent.substring(0, 50) + '...' : repliedContent}
                    </div>
                `;
            }
            
            messageHTML += `
                    <p>${message}</p>
                </div>
                <div class="message-footer">
                    <span class="message-time">${timeString}</span>
                    <div class="message-actions">
                        <button class="action-button reply-button" data-message-id="${messageId}">回覆</button>
                        <button class="action-button recall-button" data-message-id="${messageId}">收回</button>
                        <button class="action-button delete-button" data-message-id="${messageId}">刪除</button>
                    </div>
                </div>
            `;
            
            messageEl.innerHTML = messageHTML;
            
            // 添加到訊息容器
            messagesContainer.appendChild(messageEl);
            
            // 清空輸入框並重設高度
            messageInput.value = '';
            resetTextareaHeight();
            
            // 移除回覆預覽(如果有)
            const replyPreview = document.querySelector('.reply-preview');
            if (replyPreview) {
                replyPreview.remove();
            }
            
            // 清除回覆相關的資料
            messageInput.removeAttribute('data-reply-to');
            messageInput.removeAttribute('data-replied-to');
            
            // 自動滾動到底部
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // 綁定訊息操作按鈕事件
            bindMessageActions(messageEl);
            
            // 綁定回覆訊息點擊事件
            const repliedMessageEl = messageEl.querySelector('.replied-message');
            if (repliedMessageEl) {
                repliedMessageEl.addEventListener('click', function() {
                    const originalMsgId = this.getAttribute('data-original-msg');
                    const originalMsg = document.getElementById(originalMsgId);
                    if (originalMsg) {
                        originalMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        originalMsg.style.backgroundColor = '#ffffcc';
                        setTimeout(() => {
                            originalMsg.style.backgroundColor = '';
                        }, 2000);
                    }
                });
            }
            
            // 模擬對方回覆
            simulateReply();
        }
    }
    
    // 重設文字區域高度
    function resetTextareaHeight() {
        messageInput.style.height = ''; // 清除之前設定的高度
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    }
    
    // 綁定訊息操作按鈕事件
    function bindMessageActions(messageElement) {
        // 回覆按鈕 - 現在可以回覆任何訊息，包括對方的訊息
        const replyButton = messageElement.querySelector('.reply-button');
        if (replyButton) {
            replyButton.addEventListener('click', function() {
                const messageId = this.getAttribute('data-message-id');
                const targetMessage = document.getElementById(messageId);
                const messageContent = targetMessage.querySelector('.message-content p').textContent;
                
                // 判斷是回覆自己的訊息還是對方的訊息
                const isStrangerMessage = targetMessage.classList.contains('stranger');
                replyToMessage(messageId, messageContent, isStrangerMessage);
            });
        }
        
        // 收回按鈕
        const recallButton = messageElement.querySelector('.recall-button');
        if (recallButton) {
            recallButton.addEventListener('click', function() {
                const messageId = this.getAttribute('data-message-id');
                recallMessage(messageId);
            });
        }
        
        // 刪除按鈕
        const deleteButton = messageElement.querySelector('.delete-button');
        if (deleteButton) {
            deleteButton.addEventListener('click', function() {
                const messageId = this.getAttribute('data-message-id');
                deleteMessage(messageId);
            });
        }
    }
    
    // 回覆訊息 - 更新參數，添加判斷是否回覆對方的訊息
    function replyToMessage(messageId, content, isStrangerMessage = false) {
        // 尋找被回覆訊息的發送者名稱
        const repliedTo = isStrangerMessage ? '陌生人' : (userSettings.nickname || '你');
        
        // 創建回覆預覽
        const replyPreview = document.createElement('div');
        replyPreview.classList.add('reply-preview');
        
        // 根據回覆對象添加不同的類別
        const replyClass = isStrangerMessage ? 'reply-to-stranger' : 'reply-to-self';
        replyPreview.innerHTML = `
            <div class="reply-content ${replyClass}">
                <span class="reply-to">回覆給 ${repliedTo}</span>
                <span class="reply-text">${content.length > 30 ? content.substring(0, 30) + '...' : content}</span>
            </div>
            <button class="cancel-reply"><i class="fas fa-times"></i></button>
        `;
        
        // 在輸入區域前添加回覆預覽
        const chatInput = document.querySelector('.chat-input');
        const inputContainer = document.querySelector('.input-container');
        
        // 移除已有的回覆預覽(如果有的話)
        const existingPreview = chatInput.querySelector('.reply-preview');
        if (existingPreview) {
            existingPreview.remove();
        }
        
        chatInput.insertBefore(replyPreview, inputContainer);
        
        // 聚焦輸入框
        messageInput.focus();
        
        // 記錄被回覆的訊息ID和發送者名稱
        messageInput.setAttribute('data-reply-to', messageId);
        messageInput.setAttribute('data-replied-to', repliedTo);
        
        // 綁定取消回覆按鈕事件
        const cancelButton = replyPreview.querySelector('.cancel-reply');
        cancelButton.addEventListener('click', function() {
            replyPreview.remove();
            messageInput.removeAttribute('data-reply-to');
            messageInput.removeAttribute('data-replied-to');
        });
    }
    
    // 收回訊息
    function recallMessage(messageId) {
        const messageEl = document.getElementById(messageId);
        if (messageEl) {
            const messageContent = messageEl.querySelector('.message-content');
            messageContent.innerHTML = '<p class="recalled-message">此訊息已收回</p>';
            
            // 移除操作按鈕
            const messageActions = messageEl.querySelector('.message-actions');
            if (messageActions) {
                messageActions.innerHTML = '';
            }
        }
    }
    
    // 刪除訊息
    function deleteMessage(messageId) {
        const messageEl = document.getElementById(messageId);
        if (messageEl && confirm('確定要刪除此訊息嗎？')) {
            messageEl.remove();
        }
    }
    
    // 模擬對方回覆
    function simulateReply() {
        // 在最新消息後添加打字指示器
        messagesContainer.appendChild(typingIndicator);
        // 顯示打字指示器
        typingIndicator.style.display = 'flex';
        
        // 自動滾動到底部，確保打字指示器可見
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // 模擬回覆延遲 (1-3秒)
        const replyDelay = 1000 + Math.random() * 2000;
        setTimeout(() => {
            // 隱藏打字指示器並從DOM中暫時移除
            typingIndicator.style.display = 'none';
            if (typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }
            
            // 生成回覆
            const replies = [
                "真的嗎？好有趣！",
                "我也是這麼想的！",
                "哈哈，你真幽默！",
                "這讓我想到...",
                "我之前從沒想過這個觀點。",
                "不好意思，我可以問你更多關於這個的事情嗎？",
                "這在你們那裡是常見的嗎？",
                "我覺得這個想法很棒！",
                "謝謝分享，我學到了新東西！",
                "你喜歡什麼類型的音樂/電影？"
            ];
            
            // 隨機決定是否回覆最新訊息
            const shouldReply = Math.random() > 0.7; // 30% 的機率直接回覆剛剛的訊息
            
            // 生成唯一ID用於識別訊息
            const messageId = 'msg-' + Date.now();
            
            // 隨機選擇一個回覆
            const randomReply = replies[Math.floor(Math.random() * replies.length)];
            
            // 獲取當前時間
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const timeString = `${hours}:${minutes}`;
            
            // 創建新的訊息元素
            const messageEl = document.createElement('div');
            messageEl.classList.add('message', 'stranger');
            messageEl.id = messageId;
            
            let messageHTML = `
                <div class="message-header">
                    <img src="images/avatar2.png" class="message-avatar">
                    <span class="message-nickname">陌生人</span>
                </div>
                <div class="message-content">
            `;
            
            // 如果要回覆，找到最新的用戶訊息
            if (shouldReply) {
                const userMessages = document.querySelectorAll('.message.self');
                if (userMessages.length > 0) {
                    const latestMessage = userMessages[userMessages.length - 1];
                    const latestMessageId = latestMessage.id;
                    const latestMessageContent = latestMessage.querySelector('.message-content p').textContent;
                    const userName = userSettings.nickname || '你';
                    
                    messageHTML += `
                        <div class="replied-message replied-message-self" data-original-msg="${latestMessageId}">
                            <div class="replied-to">回覆給 ${userName}</div>
                            ${latestMessageContent.length > 50 ? latestMessageContent.substring(0, 50) + '...' : latestMessageContent}
                        </div>
                    `;
                }
            }
            
            messageHTML += `
                    <p>${randomReply}</p>
                </div>
                <div class="message-footer">
                    <span class="message-time">${timeString}</span>
                    <div class="message-actions">
                        <button class="action-button reply-button" data-message-id="${messageId}">回覆</button>
                    </div>
                </div>
            `;
            
            messageEl.innerHTML = messageHTML;
            
            // 添加到訊息容器
            messagesContainer.appendChild(messageEl);
            
            // 綁定回覆訊息點擊事件
            const repliedMessageEl = messageEl.querySelector('.replied-message');
            if (repliedMessageEl) {
                repliedMessageEl.addEventListener('click', function() {
                    const originalMsgId = this.getAttribute('data-original-msg');
                    const originalMsg = document.getElementById(originalMsgId);
                    if (originalMsg) {
                        originalMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        originalMsg.style.backgroundColor = '#ffffcc';
                        setTimeout(() => {
                            originalMsg.style.backgroundColor = '';
                        }, 2000);
                    }
                });
            }
            
            // 綁定新增的回覆按鈕事件
            const replyButton = messageEl.querySelector('.reply-button');
            if (replyButton) {
                replyButton.addEventListener('click', function() {
                    const targetMessageId = this.getAttribute('data-message-id');
                    const targetMessageContent = messageEl.querySelector('.message-content p').textContent;
                    replyToMessage(targetMessageId, targetMessageContent, true); // true表示回覆對方的訊息
                });
            }
            
            // 自動滾動到底部
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, replyDelay);
    }
    
    // 切換到下一個聊天    
    function nextChat() {
        // 顯示系統訊息        
        const systemMsgEl = document.createElement('div');        
        systemMsgEl.classList.add('system-message');
        systemMsgEl.innerHTML = `<p>正在尋找新對象...</p>`;
        messagesContainer.appendChild(systemMsgEl);
        
        // 模擬搜尋過程 (1-2秒)
        setTimeout(() => {
            // 清空聊天記錄，只保留新的系統訊息
            messagesContainer.innerHTML = '';
            
            // 添加新的系統訊息
            const newSystemMsgEl = document.createElement('div');
            newSystemMsgEl.classList.add('system-message');
            newSystemMsgEl.innerHTML = `<p>已成功連接！開始新的聊天吧！</p>`;
            messagesContainer.appendChild(newSystemMsgEl);
            
            // 模擬對方發起聊天
            setTimeout(() => {
                // 在最新消息後添加打字指示器
                messagesContainer.appendChild(typingIndicator);
                // 顯示打字指示器
                typingIndicator.style.display = 'flex';
                
                // 自動滾動到底部，確保打字指示器可見
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                setTimeout(() => {
                    // 隱藏打字指示器並從DOM中暫時移除
                    typingIndicator.style.display = 'none';
                    if (typingIndicator.parentNode) {
                        typingIndicator.parentNode.removeChild(typingIndicator);
                    }
                    
                    // 對方的第一句話
                    const firstMessages = [
                        "嗨，你好！",
                        "Hi～很高興認識你！",
                        "哈囉，今天過得如何？",
                        "嘿！有什麼有趣的事情分享嗎？",
                        "你好啊，最近有看什麼好看的電影嗎？"
                    ];
                    
                    const randomFirstMsg = firstMessages[Math.floor(Math.random() * firstMessages.length)];
                    
                    // 獲取當前時間
                    const now = new Date();
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    const timeString = `${hours}:${minutes}`;
                    
                    // 創建新的訊息元素
                    const messageEl = document.createElement('div');
                    messageEl.classList.add('message', 'stranger');
                    messageEl.innerHTML = `
                        <div class="message-header">
                            <img src="images/avatar2.png" class="message-avatar">
                            <span class="message-nickname">陌生人</span>
                        </div>
                        <div class="message-content">
                            <p>${randomFirstMsg}</p>
                        </div>
                        <span class="message-time">${timeString}</span>
                    `;
                    
                    // 添加到訊息容器
                    messagesContainer.appendChild(messageEl);
                    
                    // 不再重新添加打字指示器，只在需要時添加
                    
                    // 自動滾動到底部
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 1500);
            }, 500);
        }, 1000 + Math.random() * 1000);
    }
    
    // 結束聊天並返回主頁
    function endChat() {
        if (confirm('確定要結束目前的聊天嗎？')) {
            window.location.href = 'main.html';
        }
    }
    
    // 按 Enter 發送訊息
    messageInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // 防止換行
            sendMessage();
        }
    });
    
    // 自動調整文本區域高度，但設定最大高度限制
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        const newHeight = Math.min(this.scrollHeight, 120); // 最大高度為120px
        this.style.height = newHeight + 'px';
        
        // 控制捲軸顯示
        if (this.scrollHeight <= this.clientHeight) {
            this.style.overflowY = 'hidden';
        } else {
            this.style.overflowY = 'auto';
        }
    });
    
    // 各種事件監聽
    sendButton.addEventListener('click', sendMessage);
    nextChatButton.addEventListener('click', nextChat);
    endChatButton.addEventListener('click', endChat);
    
    // 初始化時重設輸入框高度
    resetTextareaHeight();
    
    // 初始化時為現有的對方訊息添加回覆事件
    function initExistingMessages() {
        // 為對方訊息添加回覆按鈕事件
        document.querySelectorAll('.message.stranger .reply-button').forEach(button => {
            button.addEventListener('click', function() {
                const messageId = this.getAttribute('data-message-id');
                const targetMessage = document.getElementById(messageId) || this.closest('.message');
                const messageContent = targetMessage.querySelector('.message-content p').textContent;
                replyToMessage(targetMessage.id, messageContent, true); // true表示回覆對方的訊息
            });
        });
    }
    
    // 初始化時調用
    initExistingMessages();
});