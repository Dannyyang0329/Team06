import socketio
import json
import logging
import uuid
from django.conf import settings
from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)

# 創建Socket.IO伺服器實例
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*'  # 在生產環境中應該設置具體的來源
)

# 會話管理
sessions = {}
matching_queue = []
chat_rooms = {}

# 在連接時獲取房間ID
@sio.event
async def connect(sid, environ, auth):
    logger.info(f"客戶端已連接: {sid}")
    
    query_string = environ.get('QUERY_STRING', '')
    query_params = {}
    
    for param in query_string.split('&'):
        if '=' in param:
            key, value = param.split('=', 1)
            query_params[key] = value
    
    room_id = query_params.get('room')
    if room_id:
        await sio.enter_room(sid, room_id)
        sessions[sid] = {"room": room_id}
        logger.info(f"客戶端 {sid} 已加入房間 {room_id}")

@sio.event
async def disconnect(sid):
    logger.info(f"客戶端已斷開連接: {sid}")
    # 處理斷開連接邏輯
    if sid in sessions:
        room = sessions[sid].get("room")
        user_id = sessions[sid].get("user_id")
        
        if room:
            # 通知房間其他人用戶已離開
            if user_id:
                await sio.emit("user_left", {"user_id": user_id}, room=room, skip_sid=sid)
            
            await sio.leave_room(sid, room)
        
        # 從等待匹配的佇列中移除
        global matching_queue
        matching_queue = [user for user in matching_queue if user.get('sid') != sid]
        
        # 清除會話
        del sessions[sid]

# 匹配事件
@sio.event
async def start_matching(sid, data):
    logger.info(f"開始匹配: {sid}, 數據: {data}")
    
    user_data = data.get('user_data', {})
    user_id = user_data.get('user_id')
    
    if not user_id:
        return
    
    # 存儲使用者資料
    sessions[sid] = {
        "user_id": user_id,
        "user_data": user_data
    }
    
    # 嘗試匹配
    if matching_queue:
        # 有等待的用戶，進行匹配
        other_user = matching_queue.pop(0)
        other_sid = other_user['sid']
        
        # 創建一個新的聊天室
        room_id = f"chat_{uuid.uuid4().hex}"
        
        # 讓兩個用戶加入這個房間
        await sio.enter_room(sid, room_id)
        await sio.enter_room(other_sid, room_id)
        
        # 更新會話數據
        sessions[sid]['room'] = room_id
        sessions[other_sid]['room'] = room_id
        
        # 儲存房間資訊
        chat_rooms[room_id] = {
            'users': [user_id, other_user['user_id']],
            'user_data': {
                user_id: user_data,
                other_user['user_id']: other_user['user_data']
            }
        }
        
        # 找到共同標籤
        tags1 = set(user_data.get('tags', []))
        tags2 = set(other_user['user_data'].get('tags', []))
        common_tags = list(tags1.intersection(tags2))
        
        # 通知兩個用戶匹配成功
        await sio.emit('match_found', {
            'action': 'match_found',
            'room_id': room_id,
            'matched_user': other_user['user_data'],
            'common_tags': common_tags
        }, to=sid)
        
        await sio.emit('match_found', {
            'action': 'match_found',
            'room_id': room_id,
            'matched_user': user_data,
            'common_tags': common_tags
        }, to=other_sid)
    else:
        # 沒有等待的用戶，加入等待佇列
        matching_queue.append({
            'sid': sid,
            'user_id': user_id,
            'user_data': user_data
        })
        
        await sio.emit('waiting_for_match', {
            'action': 'waiting_for_match'
        }, to=sid)

@sio.event
async def cancel_matching(sid):
    global matching_queue
    matching_queue = [user for user in matching_queue if user.get('sid') != sid]
    logger.info(f"用戶 {sid} 取消了匹配")

@sio.event
async def find_next(sid, data):
    user_id = data.get('user_id')
    if user_id and sid in sessions:
        room = sessions[sid].get("room")
        
        if room:
            # 通知房間其他人用戶已離開
            await sio.emit("user_left", {"user_id": user_id}, room=room, skip_sid=sid)
            
            # 離開當前房間
            await sio.leave_room(sid, room)
            
            # 更新會話
            if "room" in sessions[sid]:
                del sessions[sid]["room"]
    
    logger.info(f"用戶 {sid} 尋找下一個聊天")

# 聊天訊息事件
@sio.event
async def send_message(sid, data):
    user_id = data.get('user_id')
    message = data.get('message')
    
    if not (user_id and message):
        return
    
    room = sessions[sid].get('room')
    
    if room:
        # 這裡可以加入資料庫保存邏輯
        
        # 廣播訊息到房間
        await sio.emit('new_message', {
            'action': 'new_message',
            'message': message
        }, room=room)
        
        logger.info(f"訊息已發送到房間 {room}: {message}")

@sio.event
async def recall_message(sid, data):
    message_id = data.get('message_id')
    client_id = data.get('client_id')
    user_id = data.get('user_id')
    
    if not (message_id or client_id):
        return
    
    room = sessions[sid].get('room')
    
    if room:
        # 廣播訊息收回事件
        await sio.emit('message_recalled', {
            'action': 'message_recalled',
            'message_id': message_id,
            'client_id': client_id,
            'user_id': user_id
        }, room=room)
        
        logger.info(f"訊息已收回: {message_id}")

@sio.event
async def delete_message(sid, data):
    message_id = data.get('message_id')
    user_id = data.get('user_id')
    
    if not message_id:
        return
    
    room = sessions[sid].get('room')
    
    if room:
        # 廣播訊息刪除事件
        await sio.emit('message_deleted', {
            'action': 'message_deleted',
            'message_id': message_id,
            'user_id': user_id
        }, room=room)
        
        logger.info(f"訊息已刪除: {message_id}")
