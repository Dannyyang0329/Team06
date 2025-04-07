// 移除 import 語句，改用 script 標籤載入的全域變數
// const React = window.React;
// const ReactDOM = window.ReactDOM;

document.addEventListener('DOMContentLoaded', function() {
    // 獲取DOM元素
    const messagesContainer = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-message');
    const nextChatButton = document.getElementById('next-chat');
    const endChatButton = document.getElementById('end-chat');
    const typingIndicator = document.querySelector('.typing-indicator');
    const statusIndicator = document.getElementById('status-indicator');
    const chatPartnerLabel = document.getElementById('chat-partner-label');
    const matchingTags = document.getElementById('matching-tags');
    
    // 從localStorage中獲取用戶設置
    const userSettings = JSON.parse(localStorage.getItem('userSettings')) || {};

    // 使用 sessionStorage 確保每個分頁都有唯一ID
    let userId = sessionStorage.getItem('userId');
    if (!userId) {
        // 生成包含時間戳的唯一ID
        const timestamp = new Date().getTime();
        const random = Math.random().toString(36).substring(2, 10);
        userId = `user-${timestamp}-${random}`;
        sessionStorage.setItem('userId', userId);
    }
    
    // 每次打開新的聊天也為此聊天會話生成一個單獨的sessionId
    const sessionId = 'session_' + Date.now() + Math.random().toString(36).substring(2, 9);

    // WebSocket連接
    let matchingSocket = null;
    let chatSocket = null;
    let currentRoomId = null;
    let chatPartner = null;
    let isMatched = false;

    // 更新用戶資訊顯示
    if (userSettings.nickname) {
        document.getElementById('user-nickname').innerText = userSettings.nickname;
    }
    if (userSettings.avatar) {
        document.getElementById('user-avatar').src = `/static/images/avatar${userSettings.avatar}.png`;
    }

    // 從DOM中移除打字指示器，稍後會在需要時將其添加到適當的位置
    if (typingIndicator && typingIndicator.parentNode) {
        typingIndicator.parentNode.removeChild(typingIndicator);
    }
    
    // 初始化匹配WebSocket連接
    function initMatchingSocket() {
        const wsScheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const wsUrl = wsScheme + window.location.host + '/ws/matching/';
        
        matchingSocket = new WebSocket(wsUrl);
        
        matchingSocket.onopen = function(e) {
            console.log('匹配WebSocket連接已建立');
            
            // 發送開始匹配請求，包含userId但不加入前綴
            matchingSocket.send(JSON.stringify({
                action: 'start_matching',
                user_data: {
                    user_id: userId,
                    session_id: sessionId,  // 加入會話ID增加唯一性
                    nickname: userSettings.nickname || '匿名用戶',
                    avatar: userSettings.avatar || '1',
                    mood: userSettings.mood || 'neutral',
                    gender: userSettings.gender || 'other',
                    preferredGender: userSettings.preferredGender || 'all',
                    tags: userSettings.tags || []
                }
            }));
            
            // 添加系統消息：正在尋找匹配
            addSystemMessage('正在尋找聊天對象，請耐心等待...');
        };
        
        matchingSocket.onmessage = function(e) {
            const data = JSON.parse(e.data);
            
            if (data.action === 'match_found') {
                // 匹配成功
                currentRoomId = data.room_id;
                chatPartner = data.matched_user;
                isMatched = true;
                
                // 顯示匹配成功消息
                addSystemMessage(`已配對成功！與 ${chatPartner.nickname} 開始聊天吧！`);
                
                // 更新聊天頭部信息
                statusIndicator.classList.remove('waiting');
                statusIndicator.classList.add('online');
                chatPartnerLabel.textContent = chatPartner.nickname;
                
                // 如果有共同標籤，顯示
                if (data.common_tags && data.common_tags.length > 0) {
                    matchingTags.textContent = data.common_tags.join(', ');
                } else {
                    matchingTags.style.display = 'none';
                }
                
                // 啟用輸入框和發送按鈕
                messageInput.disabled = false;
                sendButton.disabled = false;
                
                // 關閉匹配WebSocket
                matchingSocket.close();
                
                // 建立聊天WebSocket連接
                initChatSocket(currentRoomId);
            } else if (data.action === 'waiting_for_match') {
                // 等待匹配
                addSystemMessage('正在等待其他用戶加入，請耐心等待...');
            }
        };
        
        matchingSocket.onclose = function(e) {
            console.log('匹配WebSocket連接已關閉');
            
            // 如果沒找到匹配，5秒後重連
            if (!isMatched) {
                setTimeout(function() {
                    addSystemMessage('正在重新尋找聊天對象...');
                    initMatchingSocket();
                }, 5000);
            }
        };
        
        matchingSocket.onerror = function(err) {
            console.error('匹配WebSocket錯誤:', err);
            addSystemMessage('連接發生錯誤，請刷新頁面重試。');
        };
    }
    
    // 初始化聊天WebSocket連接
    function initChatSocket(roomId) {
        const wsScheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const wsUrl = wsScheme + window.location.host + `/ws/chat/?room=${roomId}`;
        
        chatSocket = new WebSocket(wsUrl);
        
        chatSocket.onopen = function(e) {
            console.log('聊天WebSocket連接已建立');
        };
        
        chatSocket.onmessage = function(e) {
            const data = JSON.parse(e.data);
            
            if (data.action === 'new_message') {
                // 收到新消息
                const message = data.message;
                
                // 如果是自己發送的消息，可能需要更新本地消息ID
                if (message.sender_id === userId) {
                    // 找到對應的客戶端ID訊息元素
                    const clientMessageEl = document.getElementById(message.client_id);
                    if (clientMessageEl) {
                        // 保存原始客戶端ID到自訂屬性
                        clientMessageEl.setAttribute('data-client-id', message.client_id);
                        // 使用資料庫ID替換客戶端ID
                        clientMessageEl.id = message.id;
                        
                        // 更新訊息操作按鈕的data-message-id
                        const buttons = clientMessageEl.querySelectorAll('[data-message-id]');
                        buttons.forEach(button => {
                            button.setAttribute('data-message-id', message.id);
                        });
                    }
                    return; // 不要重複顯示自己的消息
                }
                
                // 顯示對方的消息
                receiveMessage(message);
            } else if (data.action === 'message_recalled') {
                // 處理消息被收回的事件
                const messageId = data.message_id;
                const clientId = data.client_id;
                
                // 首先嘗試使用消息ID查找
                let messageEl = document.getElementById(messageId);
                
                // 如果找不到並且有客戶端ID，嘗試用客戶端ID查找
                if (!messageEl && clientId) {
                    messageEl = document.getElementById(clientId);
                }
                
                // 如果仍找不到，嘗試查找標記了對應client_id的元素
                if (!messageEl && clientId) {
                    document.querySelectorAll('[data-client-id="' + clientId + '"]').forEach(el => {
                        messageEl = el;
                    });
                }
                
                if (messageEl) {
                    setMessageAsRecalled(messageEl.id);
                } else {
                    console.warn('無法找到要標記為收回的訊息:', messageId, clientId);
                }
            } else if (data.action === 'message_deleted') {
                const messageEl = document.getElementById(data.message_id);
                if (messageEl && messageEl.classList.contains('self')) {
                    // 隱藏訊息僅對發送者
                    messageEl.style.display = 'none';
                }
            } else if (data.action === 'user_left') {
                // 對方離開聊天
                if (data.user_id !== userId) {
                    addSystemMessage(`${chatPartner.nickname} 已離開聊天。`);
                    
                    // 顯示對方已離開的狀態
                    statusIndicator.classList.remove('online');
                    statusIndicator.classList.add('offline');
                    
                    // 禁用輸入框和發送按鈕
                    messageInput.disabled = true;
                    sendButton.disabled = true;
                    
                    // 提示找新對象
                    setTimeout(function() {
                        addSystemMessage('請點擊"下一位"按鈕開始新的聊天。');
                    }, 2000);
                }
            }
        };
        
        chatSocket.onclose = function(e) {
            console.log('聊天WebSocket連接已關閉');
            
            // 如果是因為對方離開而關閉，不要重連
            if (statusIndicator.classList.contains('offline')) {
                return;
            }
            
            // 嘗試重連
            setTimeout(function() {
                if (currentRoomId) {
                    initChatSocket(currentRoomId);
                }
            }, 3000);
        };
        
        chatSocket.onerror = function(err) {
            console.error('聊天WebSocket錯誤:', err);
            addSystemMessage('聊天連接發生錯誤，請刷新頁面重試。');
        };
    }
    
    // 發送訊息函數
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message && chatSocket && chatSocket.readyState === WebSocket.OPEN) {
            // 獲取當前時間
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const timeString = `${hours}:${minutes}`;
            
            // 檢查是否為回覆訊息
            const replyToId = messageInput.getAttribute('data-reply-to');
            const repliedTo = messageInput.getAttribute('data-replied-to');
            
            // 生成唯一ID用於識別訊息
            const messageId = 'msg-' + Date.now();
            
            // 創建訊息資料
            const messageData = {
                content: message,
                replied_to: replyToId || null,
                client_id: messageId  // 添加客戶端ID
            };
            
            // 通過WebSocket發送訊息
            chatSocket.send(JSON.stringify({
                action: 'send_message',
                user_id: userId,
                message: messageData
            }));
            
            // 創建新的訊息元素
            const messageEl = document.createElement('div');
            messageEl.classList.add('message', 'self');
            messageEl.id = messageId;
            
            let messageHTML = `
                <div class="message-header">
                    <img src="${userSettings.avatar ? '/static/images/avatar' + userSettings.avatar + '.png' : '/static/images/avatar1.png'}" class="message-avatar">
                    <span class="message-nickname">${userSettings.nickname || '你'}</span>
                </div>
                <div class="message-content">
            `;
            
            // 如果是回覆訊息，添加回覆部分
            if (replyToId && repliedTo) {
                const repliedMessageEl = document.getElementById(replyToId);
                let repliedContent = '';
                
                if (repliedMessageEl) {
                    repliedContent = repliedMessageEl.querySelector('.message-content p').textContent;
                }
                
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
        }
    }
    
    // 接收訊息
    function receiveMessage(message) {
        // 顯示對方正在輸入的指示器
        messagesContainer.appendChild(typingIndicator);
        typingIndicator.style.display = 'flex';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // 模擬延遲接收
        setTimeout(() => {
            // 隱藏打字指示器
            typingIndicator.style.display = 'none';
            if (typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }
            
            // 創建新的訊息元素
            const messageEl = document.createElement('div');
            messageEl.classList.add('message', 'stranger');
            messageEl.id = message.id;
            
            let messageHTML = `
                <div class="message-header">
                    <img src="/static/images/avatar${chatPartner.avatar || '1'}.png" class="message-avatar">
                    <span class="message-nickname">${chatPartner.nickname}</span>
                </div>
                <div class="message-content">
            `;
            
            // 如果是回覆訊息
            if (message.replied_to) {
                messageHTML += `
                    <div class="replied-message" data-original-msg="${message.replied_to}">
                        <div class="replied-to">回覆給 ${message.replied_to_sender}</div>
                        ${message.replied_to_content && message.replied_to_content.length > 50 
                            ? message.replied_to_content.substring(0, 50) + '...' 
                            : message.replied_to_content}
                    </div>
                `;
            }
            
            messageHTML += `
                    <p>${message.content}</p>
                </div>
                <div class="message-footer">
                    <span class="message-time">${message.sent_at}</span>
                    <div class="message-actions">
                        <button class="action-button reply-button" data-message-id="${message.id}">回覆</button>
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
                    replyToMessage(targetMessageId, targetMessageContent, true);
                });
            }
            
            // 自動滾動到底部
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 1000);
    }
    
    // 添加系統消息
    function addSystemMessage(text) {
        const systemMsgEl = document.createElement('div');
        systemMsgEl.classList.add('system-message');
        systemMsgEl.innerHTML = `<p>${text}</p>`;
        messagesContainer.appendChild(systemMsgEl);
        
        // 自動滾動到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // 重設文字區域高度
    function resetTextareaHeight() {
        messageInput.style.height = ''; // 清除之前設定的高度
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    }
    
    // 綁定訊息操作按鈕事件
    function bindMessageActions(messageElement) {
        // 回覆按鈕
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
    
    // 回覆訊息
    function replyToMessage(messageId, content, isStrangerMessage = false) {
        // 尋找被回覆訊息的發送者名稱
        const repliedTo = isStrangerMessage ? chatPartner.nickname : (userSettings.nickname || '你');
        
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
        if (messageEl && chatSocket && chatSocket.readyState === WebSocket.OPEN) {
            // 發送收回請求
            chatSocket.send(JSON.stringify({
                action: 'recall_message',
                message_id: messageId,
                user_id: userId,
                client_id: messageId  // 發送客戶端ID
            }));
            
            // 在UI上顯示收回效果
            setMessageAsRecalled(messageId);
        }
    }
    
    // 設定訊息為已收回狀態
    function setMessageAsRecalled(messageId) {
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
        if (messageEl && chatSocket && chatSocket.readyState === WebSocket.OPEN && confirm('確定要刪除此訊息嗎？')) {
            // 發送刪除請求
            chatSocket.send(JSON.stringify({
                action: 'delete_message',
                message_id: messageId,
                user_id: userId
            }));
            
            // 在UI上刪除訊息
            messageEl.remove();
        }
    }
    
    // 切換到下一個聊天    
    function nextChat() {
        // 如果已經在聊天中
        if (chatSocket && isMatched) {
            if (confirm('確定要尋找新的聊天對象嗎？')) {
                // 通知服務器用戶想要尋找下一個聊天對象
                chatSocket.send(JSON.stringify({
                    action: 'find_next',
                    user_id: userId
                }));
                
                // 關閉當前聊天連接
                chatSocket.close();
                chatSocket = null;
                
                // 重置狀態
                isMatched = false;
                currentRoomId = null;
                chatPartner = null;
                
                // 清空聊天記錄
                messagesContainer.innerHTML = '';
                
                // 添加系統消息
                addSystemMessage('正在尋找新的聊天對象...');
                
                // 更新狀態顯示
                statusIndicator.classList.remove('online', 'offline');
                statusIndicator.classList.add('waiting');
                chatPartnerLabel.textContent = '等待配對...';
                matchingTags.textContent = '';
                
                // 禁用輸入框和發送按鈕
                messageInput.disabled = true;
                sendButton.disabled = true;
                
                // 重新初始化匹配WebSocket
                initMatchingSocket();
            }
        } else {
            // 如果還未開始聊天或尚未匹配成功
            // 清空聊天記錄
            messagesContainer.innerHTML = '';
            
            // 添加系統消息
            addSystemMessage('正在尋找聊天對象...');
            
            // 重新初始化匹配WebSocket
            if (matchingSocket) {
                matchingSocket.close();
            }
            initMatchingSocket();
        }
    }
    
    // 結束聊天並返回主頁
    function endChat() {
        if (confirm('確定要結束目前的聊天嗎？')) {
            // 如果正在聊天中，通知服務器用戶離開
            if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
                chatSocket.send(JSON.stringify({
                    action: 'find_next',
                    user_id: userId
                }));
                chatSocket.close();
            }
            
            // 如果正在匹配中，取消匹配
            if (matchingSocket && matchingSocket.readyState === WebSocket.OPEN) {
                matchingSocket.send(JSON.stringify({
                    action: 'cancel_matching'
                }));
                matchingSocket.close();
            }
            
            // 返回主頁
            window.location.href = '/';
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
    
    // 頁面離開或刷新時，通知服務器用戶離開
    window.addEventListener('beforeunload', function() {
        if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
            chatSocket.send(JSON.stringify({
                action: 'find_next',
                user_id: userId
            }));
        }
        
        if (matchingSocket && matchingSocket.readyState === WebSocket.OPEN) {
            matchingSocket.send(JSON.stringify({
                action: 'cancel_matching'
            }));
        }
    });
    
    // 初始化匹配WebSocket連接
    initMatchingSocket();
});