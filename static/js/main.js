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
    
    // 保存偏好設定
    savePreferencesBtn.addEventListener('click', function() {
        // 獲取選擇的性別偏好
        const genderRadio = document.querySelector('input[name="gender"]:checked');
        if (genderRadio) {
            userSettings.preferredGender = genderRadio.value;
        }
        
        // 獲取選擇的標籤
        userSettings.tags = [];
        document.querySelectorAll('.tag.selected').forEach(tag => {
            userSettings.tags.push(tag.textContent);
        });
        
        // 保存設置
        saveUserSettings();
        
        // 關閉模態框
        preferencesModal.style.display = 'none';
    });
    
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
});