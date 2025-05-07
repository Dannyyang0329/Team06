document.addEventListener('DOMContentLoaded', function() {
    // 獲取元素
    const setProfileBtn = document.getElementById('set-profile');
    const setPreferencesBtn = document.getElementById('set-preferences');
    const profileModal = document.getElementById('profile-modal');
    const closeProfileBtn = document.getElementById('close-profile');
    const saveProfileBtn = document.getElementById('save-profile');
    const preferencesModal = document.getElementById('preferences-modal');
    const closePreferencesBtn = document.getElementById('close-preferences');
    const savePreferencesBtn = document.getElementById('save-preferences');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const moodOptions = document.querySelectorAll('.mood-option');
    const genderOptions = document.querySelectorAll('.gender-option');
    const nicknameInput = document.getElementById('nickname');
    const tags = document.querySelectorAll('.tag');
    const matchingScreen = document.getElementById('matching-screen');
    const cancelMatchingBtn = document.getElementById('cancel-matching');
    const showGuideBtn = document.getElementById('show-guide');
    const guideModal = document.getElementById('guide-modal');
    const closeGuideBtn = document.getElementById('close-guide');
    const onlineCountEl = document.getElementById('online-count');
    const chatCountEl = document.getElementById('chat-count');
    const authLogin = document.getElementById('auth-login');
    const authRegister = document.getElementById('auth-register');
    const logoutBtn = document.getElementById('logout-btn');
    const authMessage = document.getElementById('auth-message');
    
    // 用戶設置
    let userSettings = {
        avatar: '1',
        nickname: '',
        mood: '',
        gender: '',
        preferredGender: 'all',
        tags: []
    };
    
    // 本地存儲功能
    function loadUserSettings() {
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
            userSettings = JSON.parse(savedSettings);
            
            // 應用已保存的設置
            if (userSettings.avatar) {
                document.querySelector(`.avatar-option[data-avatar="${userSettings.avatar}"]`)?.classList.add('selected');
            }
            
            if (userSettings.nickname) {
                nicknameInput.value = userSettings.nickname;
            }
            
            if (userSettings.mood) {
                document.querySelector(`.mood-option[data-mood="${userSettings.mood}"]`)?.classList.add('selected');
            }
            
            if (userSettings.gender) {
                document.querySelector(`.gender-option[data-gender="${userSettings.gender}"]`)?.classList.add('selected');
            }
        }
    }
    
    function saveUserSettings() {
        localStorage.setItem('userSettings', JSON.stringify(userSettings));
    }
    
    // 初始化
    loadUserSettings();
    
    // 模擬在線用戶數量
    function simulateOnlineUsers() {
        const baseCount = 3000;
        const randomOffset = Math.floor(Math.random() * 1000);
        const count = baseCount + randomOffset;
        onlineCountEl.textContent = count.toLocaleString();
        
        // 聊天數量約為在線用戶的35-45%
        const chatPercentage = 0.35 + Math.random() * 0.1;
        const chatCount = Math.floor(count * chatPercentage);
        chatCountEl.textContent = chatCount.toLocaleString();
    }
    
    // 定期更新在線用戶數量
    simulateOnlineUsers();
    setInterval(simulateOnlineUsers, 30000);
    
    // 頭像選擇 - 確保新增的20個頭像都能正常工作
    avatarOptions.forEach(option => {
        option.addEventListener('click', function() {
            avatarOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            userSettings.avatar = this.getAttribute('data-avatar');
            
            // 預覽選擇的頭像 - 修正路徑
            const previewAvatar = document.getElementById('preview-avatar');
            if (previewAvatar) {
                previewAvatar.src = `/static/images/avatar${userSettings.avatar}.png`;
            }
        });
    });
    
    // 心情選擇
    moodOptions.forEach(option => {
        option.addEventListener('click', function() {
            moodOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            userSettings.mood = this.getAttribute('data-mood');
        });
    });
    
    // 性別選擇
    genderOptions.forEach(option => {
        option.addEventListener('click', function() {
            genderOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            userSettings.gender = this.getAttribute('data-gender');
        });
    });
    
    // 暱稱輸入
    nicknameInput.addEventListener('input', function() {
        userSettings.nickname = this.value;
    });
    
    // 標籤選擇
    tags.forEach(tag => {
        tag.addEventListener('click', function() {
            if (this.classList.contains('selected')) {
                this.classList.remove('selected');
                userSettings.tags = userSettings.tags.filter(t => t !== this.textContent);
            } else {
                // 最多選擇3個標籤
                if (document.querySelectorAll('.tag.selected').length < 3) {
                    this.classList.add('selected');
                    userSettings.tags.push(this.textContent);
                }
            }
        });
    });
    
    // 顯示個人檔案設定模態框
    setProfileBtn.addEventListener('click', function() {
        profileModal.style.display = 'flex';
    });
    
    // 關閉個人檔案設定模態框
    closeProfileBtn.addEventListener('click', function() {
        profileModal.style.display = 'none';
    });
    
    // 保存個人檔案並開始聊天
    saveProfileBtn.addEventListener('click', function() {
        // 檢查是否有暱稱
        if (!userSettings.nickname) {
            alert('請輸入暱稱');
            nicknameInput.focus();
            return;
        }
        
        // 檢查是否選了心情
        if (!userSettings.mood) {
            alert('請選擇心情');
            return;
        }
        
        // 檢查是否選了性別
        if (!userSettings.gender) {
            alert('請選擇性別');
            return;
        }
        
        // 保存設置
        saveUserSettings();
        
        // 關閉模態框
        profileModal.style.display = 'none';
        
        // 顯示匹配中界面
        matchingScreen.style.display = 'flex';
        
        // 直接跳轉到聊天頁面，不需要等待模擬
        window.location.href = '/chat/';
    });
    
    // 顯示偏好設定模態框
    setPreferencesBtn.addEventListener('click', function() {
        preferencesModal.style.display = 'flex';
    });
    
    // 關閉偏好設定模態框
    closePreferencesBtn.addEventListener('click', function() {
        preferencesModal.style.display = 'none';
    });
    
    // Use jQuery AJAX to save preferences
    savePreferencesBtn.addEventListener('click', function() {
        const genderRadio = document.querySelector('input[name="gender"]:checked');
        if (genderRadio) {
            userSettings.preferredGender = genderRadio.value;
        }

        userSettings.tags = [];
        document.querySelectorAll('.tag.selected').forEach(tag => {
            userSettings.tags.push(tag.textContent);
        });

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

    // 獲取 CSRF Token 的輔助函數
    function getCSRFToken() {
        const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
        return csrfToken ? csrfToken.value : '';
    }
    
    // 取消匹配
    cancelMatchingBtn.addEventListener('click', function() {
        matchingScreen.style.display = 'none';
    });
    
    // 顯示使用指南
    showGuideBtn.addEventListener('click', function() {
        guideModal.style.display = 'flex';
    });
    
    // 關閉使用指南
    closeGuideBtn.addEventListener('click', function() {
        guideModal.style.display = 'none';
    });
    
    // 點擊模態框外部關閉
    window.addEventListener('click', function(event) {
        if (event.target === profileModal) {
            profileModal.style.display = 'none';
        } else if (event.target === preferencesModal) {
            preferencesModal.style.display = 'none';
        } else if (event.target === guideModal) {
            guideModal.style.display = 'none';
        }
    });

    // Token refresh mechanism
    async function refreshToken() {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) {
            clearAuthData();
            return false;
        }

        try {
            const response = await fetch('/api/token/refresh/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh: refresh
                })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access);
                return true;
            } else {
                clearAuthData();
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            clearAuthData();
            return false;
        }
    }

    // Add authorization header to fetch requests
    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('No access token available');
        }

        const authOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        };

        try {
            let response = await fetch(url, authOptions);
            
            if (response.status === 401) {
                const refreshed = await refreshToken();
                if (!refreshed) {
                    throw new Error('Token refresh failed');
                }
                
                // Retry with new token
                authOptions.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
                response = await fetch(url, authOptions);
            }
            
            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    // 檢查登入狀態
    async function checkAuthStatus() {
        const token = localStorage.getItem('access_token');
        
        if (token) {
            try {
                const response = await fetchWithAuth('/api/auth/user/');

                if (response.ok) {
                    const data = await response.json();
                    if (authMessage) {
                        authMessage.textContent = `已登入: ${data.nickname || data.user_id}`;
                        logoutBtn.style.display = 'inline-block';
                        if (authLogin) authLogin.style.display = 'none';
                        if (authRegister) authRegister.style.display = 'none';
                    }
                } else {
                    clearAuthData();
                }
            } catch (error) {
                console.error('驗證錯誤:', error);
                clearAuthData();
            }
        } else {
            clearAuthData();
        }
    }

    function clearAuthData() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_id');
        if (authMessage) {
            authMessage.textContent = '未登入';
            logoutBtn.style.display = 'none';
            if (authLogin) authLogin.style.display = 'inline-block';
            if (authRegister) authRegister.style.display = 'inline-block';
        }
    }

    // 初始檢查登入狀態
    checkAuthStatus();

    // 登入按鈕點擊事件
    if (authLogin) {
        authLogin.addEventListener('click', function() {
            window.location.href = '/login/';
        });
    }

    // 註冊按鈕點擊事件
    if (authRegister) {
        authRegister.addEventListener('click', function() {
            window.location.href = '/register/';
        });
    }

    // 登出按鈕點擊事件
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                const response = await fetch('/api/auth/logout/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    },
                    body: JSON.stringify({
                        refresh: localStorage.getItem('refresh_token')
                    })
                });

                if (response.ok) {
                    clearAuthData();
                    window.location.href = '/';
                } else {
                    const data = await response.json();
                    alert('登出失敗: ' + (data.message || '未知錯誤'));
                }
            } catch (error) {
                console.error('登出錯誤:', error);
                alert('登出時發生錯誤');
            }
        });
    }
});