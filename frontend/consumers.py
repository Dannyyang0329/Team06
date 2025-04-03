import json
import asyncio
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import uuid
from django.db import transaction

# 設置日誌
logger = logging.getLogger('chat')

# 全局等待用戶字典，用於匹配
waiting_users = {}
# 全局匹配鎖，防止同一用戶被同時匹配多次
matching_lock = {}

class MatchingConsumer(AsyncWebsocketConsumer):
    """處理使用者配對的WebSocket消費者"""
    
    async def connect(self):
        """處理WebSocket連接"""
        await self.accept()
        logger.info(f"用戶已連接到匹配系統: {self.channel_name}")
        
        # 將用戶加入匹配組
        await self.channel_layer.group_add("matching_users", self.channel_name)
    
    async def disconnect(self, close_code):
        """處理WebSocket斷開連接"""
        logger.info(f"用戶斷開連接: {self.channel_name}, code: {close_code}")
        
        # 從匹配組中移除
        await self.channel_layer.group_discard("matching_users", self.channel_name)
        
        # 如果用戶在等待匹配，從等待列表中移除
        if hasattr(self, 'user_id'):
            user_id = self.user_id
            if user_id in waiting_users:
                logger.info(f"從等待列表移除用戶: {waiting_users[user_id]['user'].nickname} (ID: {user_id})")
                del waiting_users[user_id]
            
            # 釋放匹配鎖
            if user_id in matching_lock:
                del matching_lock[user_id]
    
    async def receive(self, text_data):
        """接收並處理WebSocket消息"""
        data = json.loads(text_data)
        action = data.get('action')
        
        logger.debug(f"收到動作: {action}")
        
        if action == 'start_matching':
            # 開始配對
            user_data = data.get('user_data')
            
            logger.info(f"用戶開始匹配: {user_data.get('nickname')} (ID: {user_data.get('user_id')})")
            logger.info(f"用戶偏好: 性別={user_data.get('preferredGender', 'all')}, 標籤={user_data.get('tags', [])}")
            
            # 儲存或更新用戶資訊
            user = await self.save_user(
                user_id=user_data.get('user_id'),
                nickname=user_data.get('nickname', '匿名用戶'),
                avatar=user_data.get('avatar', '1'),
                mood=user_data.get('mood', 'neutral'),
                gender=user_data.get('gender', 'other'),
                channel_name=self.channel_name
            )
            
            self.user_id = user_data.get('user_id')
            
            # 將用戶加入等待列表
            waiting_users[self.user_id] = {
                'user': user,
                'preferred_gender': user_data.get('preferredGender', 'all'),
                'tags': user_data.get('tags', []),
                'channel_name': self.channel_name
            }
            
            logger.info(f"用戶已加入等待列表: {user.nickname} ({self.user_id})")
            logger.info(f"當前等待列表人數: {len(waiting_users)}")
            logger.debug(f"目前等待列表用戶: {', '.join([w['user'].nickname for w in waiting_users.values()])}")
            
            # 尋找匹配的用戶
            matched_user_id = await self.find_match(self.user_id)
            
            if matched_user_id:
                # 找到匹配，創建聊天室
                matched_data = waiting_users[matched_user_id]
                matched_user = matched_data['user']
                
                # 創建聊天室
                room_id = str(uuid.uuid4())
                
                # 找出共同標籤（如果有）
                user_tags = set(user_data.get('tags', []))
                matched_tags = set(matched_data.get('tags', []))
                common_tags = list(user_tags.intersection(matched_tags))
                
                logger.info(f"配對成功: {user.nickname} 和 {matched_user.nickname}, 聊天室: {room_id}")
                
                # 通知本用戶
                await self.send(text_data=json.dumps({
                    'action': 'match_found',
                    'room_id': room_id,
                    'matched_user': {
                        'nickname': matched_user.nickname,
                        'avatar': matched_user.avatar,
                        'mood': matched_user.mood,
                        'gender': matched_user.gender
                    },
                    'common_tags': common_tags
                }))
                
                # 通知匹配的用戶
                await self.channel_layer.send(
                    matched_data['channel_name'],
                    {
                        'type': 'match_notification',
                        'room_id': room_id,
                        'matched_user': {
                            'nickname': user.nickname,
                            'avatar': user.avatar,
                            'mood': user.mood,
                            'gender': user.gender
                        },
                        'common_tags': common_tags
                    }
                )
                
                # 從等待列表中移除雙方
                logger.info(f"從等待列表移除已配對用戶: {user.nickname} 和 {matched_user.nickname}")
                if self.user_id in waiting_users:
                    del waiting_users[self.user_id]
                if matched_user_id in waiting_users:
                    del waiting_users[matched_user_id]
                
                # 儲存聊天室到資料庫
                await self.save_chat_room(room_id, user, matched_user)
                
            else:
                # 沒有找到匹配，通知用戶等待
                logger.info(f"沒有找到匹配，用戶 {user.nickname} 將等待")
                await self.send(text_data=json.dumps({
                    'action': 'waiting_for_match'
                }))
                
                # 啟動定期檢查匹配的任務
                asyncio.create_task(self.check_match_periodically())
        
        elif action == 'cancel_matching':
            # 取消配對
            if hasattr(self, 'user_id') and self.user_id in waiting_users:
                user = waiting_users[self.user_id]['user']
                logger.info(f"用戶取消匹配: {user.nickname} ({self.user_id})")
                del waiting_users[self.user_id]
                
                # 釋放匹配鎖
                if self.user_id in matching_lock:
                    del matching_lock[self.user_id]
                
                await self.send(text_data=json.dumps({
                    'action': 'matching_cancelled'
                }))
    
    async def check_match_periodically(self):
        """定期檢查是否有配對"""
        try:
            await asyncio.sleep(5)  # 等待5秒後檢查
            
            if not hasattr(self, 'user_id'):
                logger.debug("定期檢查: 用戶沒有ID，跳過檢查")
                return
            
            if self.user_id in waiting_users:
                # 檢查是否仍在等待
                user_data = waiting_users[self.user_id]  # 移到這裡，確保在所有分支都定義了user_data
                user = user_data['user']
                logger.info(f"定期檢查用戶匹配: {user.nickname} ({self.user_id})")
                
                matched_user_id = await self.find_match(self.user_id)
                
                if matched_user_id:
                    # 找到匹配，創建聊天室
                    matched_data = waiting_users[matched_user_id]
                    matched_user = matched_data['user']
                    
                    # 創建聊天室
                    room_id = str(uuid.uuid4())
                    
                    # 找出共同標籤（如果有）
                    user_tags = set(user_data.get('tags', []))
                    matched_tags = set(matched_data.get('tags', []))
                    common_tags = list(user_tags.intersection(matched_tags))
                    
                    logger.info(f"定期檢查配對成功: {user_data['user'].nickname} 和 {matched_user.nickname}, 聊天室: {room_id}")
                    
                    # 通知本用戶
                    await self.send(text_data=json.dumps({
                        'action': 'match_found',
                        'room_id': room_id,
                        'matched_user': {
                            'nickname': matched_user.nickname,
                            'avatar': matched_user.avatar,
                            'mood': matched_user.mood,
                            'gender': matched_user.gender
                        },
                        'common_tags': common_tags
                    }))
                    
                    # 通知匹配的用戶
                    await self.channel_layer.send(
                        matched_data['channel_name'],
                        {
                            'type': 'match_notification',
                            'room_id': room_id,
                            'matched_user': {
                                'nickname': user_data['user'].nickname,
                                'avatar': user_data['user'].avatar,
                                'mood': user_data['user'].mood,
                                'gender': user_data['user'].gender
                            },
                            'common_tags': common_tags
                        }
                    )
                    
                    # 從等待列表中移除雙方
                    if self.user_id in waiting_users:
                        del waiting_users[self.user_id]
                    if matched_user_id in waiting_users:
                        del waiting_users[matched_user_id]
                    
                    # 儲存聊天室到資料庫
                    await self.save_chat_room(room_id, user_data['user'], matched_user)
                else:
                    # 仍然沒找到匹配，再次檢查
                    logger.info(f"定期檢查未找到匹配，用戶 {user.nickname} 繼續等待")
                    asyncio.create_task(self.check_match_periodically())
            else:
                logger.debug(f"用戶 {self.user_id} 不再等待配對，取消定期檢查")
        except Exception as e:
            logger.error(f"定期檢查匹配發生錯誤: {str(e)}")
    
    async def match_notification(self, event):
        """處理匹配通知"""
        # 發送匹配結果給客戶端
        logger.info(f"發送匹配通知: 房間 {event['room_id']}, 匹配用戶 {event['matched_user']['nickname']}")
        await self.send(text_data=json.dumps({
            'action': 'match_found',
            'room_id': event['room_id'],
            'matched_user': event['matched_user'],
            'common_tags': event.get('common_tags', [])
        }))
    
    async def find_match(self, user_id):
        """尋找匹配的用戶"""
        if user_id not in waiting_users:
            logger.error(f"用戶 {user_id} 不在等待列表中")
            return None
        
        # 獲取當前用戶偏好
        current_user_data = waiting_users[user_id]
        preferred_gender = current_user_data.get('preferred_gender', 'all')
        user_gender = current_user_data['user'].gender
        
        logger.debug(f"尋找匹配: 用戶 {current_user_data['user'].nickname}, 偏好性別 {preferred_gender}")
        logger.debug(f"等待列表中的用戶數: {len(waiting_users)}")
        logger.debug(f"等待列表中的用戶: {[f'{data['user'].nickname} ({uid})' for uid, data in waiting_users.items()]}")
        
        # 鎖定當前用戶，防止被其他進程匹配
        if user_id in matching_lock:
            logger.debug(f"用戶 {user_id} 已被鎖定，跳過匹配")
            return None
        matching_lock[user_id] = True
        
        try:
            # 遍歷所有等待中的用戶
            for other_id, other_data in list(waiting_users.items()):
                # 跳過自己
                if other_id == user_id:
                    logger.debug(f"跳過自己: {other_id}")
                    continue
                
                # 跳過已經被鎖定的用戶
                if other_id in matching_lock:
                    logger.debug(f"潛在匹配用戶 {other_id} 已被鎖定，跳過")
                    continue
                
                other_gender = other_data['user'].gender
                other_preferred_gender = other_data.get('preferred_gender', 'all')
                
                logger.debug(f"檢查潛在匹配: {other_data['user'].nickname} ({other_id}), 性別: {other_gender}, 偏好: {other_preferred_gender}")
                
                # 檢查性別偏好是否匹配
                gender_match = True
                if preferred_gender != 'all' and other_gender != preferred_gender:
                    gender_match = False
                    logger.debug(f"性別不匹配: 用戶偏好={preferred_gender}, 對方性別={other_gender}")
                if other_preferred_gender != 'all' and user_gender != other_preferred_gender:
                    gender_match = False
                    logger.debug(f"性別不匹配: 對方偏好={other_preferred_gender}, 用戶性別={user_gender}")
                
                if gender_match:
                    # 找到匹配的用戶
                    logger.info(f"找到匹配! 用戶 {current_user_data['user'].nickname} ({user_id}) 與 {other_data['user'].nickname} ({other_id})")
                    matching_lock[other_id] = True  # 鎖定對方，防止同時被其他進程匹配
                    return other_id
            
            # 沒有找到匹配
            logger.debug(f"沒有找到匹配的用戶: {current_user_data['user'].nickname}")
            return None
        finally:
            # 釋放當前用戶的鎖
            if user_id in matching_lock:
                del matching_lock[user_id]
    
    @database_sync_to_async
    def save_user(self, user_id, nickname, avatar, mood, gender, channel_name):
        """保存用戶信息到資料庫"""
        # 延遲匯入模型，確保Django已完全初始化
        from .models import User
        
        try:
            # 先檢查是否使用 sessionStorage 生成的新格式ID
            if isinstance(user_id, str) and user_id.startswith('user-'):
                # 直接使用這個ID，不需要嘗試轉換
                pass
            elif user_id:
                # 處理前端生成的非標準UUID格式
                # 使用原始ID而不是生成新的UUID
                try:
                    user_uuid = uuid.UUID(str(user_id))
                    user_id = str(user_uuid)
                except ValueError:
                    # 如果不是有效的UUID，直接使用原始ID
                    # 只記錄警告，但不替換ID
                    logger.warning(f"用戶ID格式不是標準UUID: {user_id}")
            
            if user_id:
                # 更新既有用戶
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
                if created:
                    logger.info(f"創建新用戶: {nickname} (ID: {user_id})")
                else:
                    logger.info(f"更新既有用戶: {nickname} (ID: {user_id})")
            else:
                # 創建新用戶
                user = User.objects.create(
                    nickname=nickname,
                    avatar=avatar,
                    mood=mood,
                    gender=gender,
                    channel_name=channel_name
                )
                logger.info(f"創建新用戶(無ID): {nickname} (新ID: {user.user_id})")
            
            return user
        except Exception as e:
            logger.error(f"保存用戶信息失敗: {str(e)}")
            # 創建一個新用戶作為備用
            user = User.objects.create(
                nickname=nickname,
                avatar=avatar,
                mood=mood,
                gender=gender,
                channel_name=channel_name
            )
            logger.info(f"因錯誤創建備用用戶: {nickname} (新ID: {user.user_id})")
            return user
    
    @database_sync_to_async
    def save_chat_room(self, room_id, user1, user2):
        """保存聊天室到資料庫"""
        # 延遲匯入模型，確保Django已完全初始化
        from .models import ChatRoom
        
        try:
            chat_room = ChatRoom.objects.create(
                room_id=room_id,
                user1=user1,
                user2=user2
            )
            logger.info(f"創建新聊天室: {room_id} (用戶: {user1.nickname} 和 {user2.nickname})")
            return chat_room
        except Exception as e:
            logger.error(f"創建聊天室失敗: {str(e)}")
            return None


class ChatConsumer(AsyncWebsocketConsumer):
    """處理聊天的WebSocket消費者"""
    
    async def connect(self):
        """處理WebSocket連接"""
        # 從URL查詢參數獲取房間ID
        self.room_id = self.scope['url_route']['kwargs'].get('room', None)
        if not self.room_id:
            # 嘗試從查詢字符串獲取
            query_string = self.scope['query_string'].decode()
            query_params = {}
            logger.debug(f"查詢字符串: {query_string}")
            
            try:
                if query_string:
                    for param in query_string.split('&'):
                        if '=' in param:
                            key, value = param.split('=', 1)
                            query_params[key] = value
                
                self.room_id = query_params.get('room')
                logger.info(f"從查詢參數獲取聊天室ID: {self.room_id}")
            except Exception as e:
                logger.error(f"解析查詢參數錯誤: {str(e)}")
                self.room_id = None
        
        # 驗證room_id是否是有效的UUID
        if self.room_id:
            try:
                uuid_obj = uuid.UUID(self.room_id)
                self.room_id = str(uuid_obj)  # 統一格式
                logger.info(f"已驗證聊天室ID: {self.room_id}")
            except ValueError:
                logger.error(f"無效的聊天室ID格式: {self.room_id}")
                await self.close()
                return
        
        if not self.room_id:
            # 沒有指定房間，關閉連接
            logger.error("未指定聊天室ID，關閉連接")
            await self.close()
            return
        
        self.room_group_name = f'chat_{self.room_id}'
        
        # 加入聊天室群組
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        logger.info(f"用戶已連接到聊天室 {self.room_id}: {self.channel_name}")
    
    async def disconnect(self, close_code):
        """處理WebSocket斷開連接"""
        # 離開聊天室群組
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        
        logger.info(f"用戶斷開聊天室連接: {self.channel_name}, code: {close_code}")
    
    async def receive(self, text_data):
        """接收並處理WebSocket消息"""
        data = json.loads(text_data)
        action = data.get('action')
        
        logger.debug(f"聊天室收到動作: {action}")
        
        if action == 'send_message':
            # 發送訊息
            message_data = data.get('message')
            user_id = data.get('user_id')
            
            logger.info(f"用戶 {user_id} 發送訊息: {message_data}")
            
            # 儲存訊息到資料庫
            message = await self.save_message(
                room_id=self.room_id,
                user_id=user_id,
                content=message_data.get('content', ''),
                replied_to=message_data.get('replied_to')
            )
            
            if message:
                # 向聊天室群組發送訊息
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': {
                            'id': str(message.id),
                            'sender_id': user_id,
                            'sender_nickname': message.sender.nickname,
                            'sender_avatar': message.sender.avatar,
                            'content': message.content,
                            'replied_to': str(message.replied_to.id) if message.replied_to else None,
                            'replied_to_content': message.replied_to.content if message.replied_to else None,
                            'replied_to_sender': message.replied_to.sender.nickname if message.replied_to else None,
                            'sent_at': message.sent_at.strftime('%H:%M')
                        }
                    }
                )
        
        elif action == 'recall_message':
            # 收回訊息
            message_id = data.get('message_id')
            user_id = data.get('user_id')
            
            logger.info(f"用戶 {user_id} 收回訊息: {message_id}")
            
            # 更新訊息狀態
            success = await self.recall_message(message_id, user_id)
            
            if success:
                # 通知聊天室群組
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'message_recalled',
                        'message_id': message_id
                    }
                )
        
        elif action == 'delete_message':
            # 刪除訊息
            message_id = data.get('message_id')
            user_id = data.get('user_id')
            
            logger.info(f"用戶 {user_id} 刪除訊息: {message_id}")
            
            # 更新訊息狀態
            success = await self.delete_message(message_id, user_id)
            
            if success:
                # 通知聊天室群組
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'message_deleted',
                        'message_id': message_id
                    }
                )
        
        elif action == 'find_next':
            # 用戶想尋找新對象
            user_id = data.get('user_id')
            
            logger.info(f"用戶 {user_id} 想尋找新對象，離開聊天室 {self.room_id}")
            
            # 通知聊天室群組
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_left',
                    'user_id': user_id
                }
            )
            
            # 更新聊天室狀態
            await self.update_chat_room_inactive(self.room_id)
    
    async def chat_message(self, event):
        """處理聊天消息事件"""
        logger.debug(f"廣播聊天訊息: {event['message']['id']}")
        await self.send(text_data=json.dumps({
            'action': 'new_message',
            'message': event['message']
        }))
    
    async def message_recalled(self, event):
        """處理訊息收回事件"""
        logger.debug(f"廣播訊息收回: {event['message_id']}")
        await self.send(text_data=json.dumps({
            'action': 'message_recalled',
            'message_id': event['message_id']
        }))
    
    async def message_deleted(self, event):
        """處理訊息刪除事件"""
        logger.debug(f"廣播訊息刪除: {event['message_id']}")
        await self.send(text_data=json.dumps({
            'action': 'message_deleted',
            'message_id': event['message_id']
        }))
    
    async def user_left(self, event):
        """處理用戶離開事件"""
        logger.debug(f"廣播用戶離開: {event['user_id']}")
        await self.send(text_data=json.dumps({
            'action': 'user_left',
            'user_id': event['user_id']
        }))
    
    @database_sync_to_async
    def save_message(self, room_id, user_id, content, replied_to=None):
        """儲存訊息到資料庫"""
        # 延遲匯入模型，確保Django已完全初始化
        from .models import User, ChatRoom, Message
        
        try:
            # 獲取聊天室和用戶
            chat_room = ChatRoom.objects.get(room_id=room_id)
            
            # 嘗試將user_id轉換為有效的UUID格式
            try:
                user_uuid = uuid.UUID(str(user_id))
                user_id = str(user_uuid)
            except ValueError:
                logger.error(f"無效的用戶ID格式: {user_id}")
                return None
                
            # 獲取用戶
            try:
                user = User.objects.get(user_id=user_id)
            except User.DoesNotExist:
                logger.error(f"用戶不存在: {user_id}")
                return None
            
            # 檢查用戶是否屬於該聊天室
            if user != chat_room.user1 and user != chat_room.user2:
                logger.error(f"用戶 {user.nickname} 不屬於聊天室 {room_id}")
                return None
            
            # 處理回覆訊息
            replied_to_msg = None
            if replied_to:
                try:
                    # 確保replied_to是有效的UUID格式
                    replied_uuid = uuid.UUID(str(replied_to))
                    replied_to = str(replied_uuid)
                    replied_to_msg = Message.objects.get(id=replied_to)
                    logger.info(f"回覆訊息ID: {replied_to}, 內容: {replied_to_msg.content[:20]}...")
                except ValueError:
                    logger.error(f"回覆的訊息ID格式無效: {replied_to}")
                except Message.DoesNotExist:
                    logger.error(f"回覆的訊息不存在: {replied_to}")
            
            # 創建新訊息
            message = Message.objects.create(
                room=chat_room,
                sender=user,
                content=content,
                replied_to=replied_to_msg
            )
            
            logger.info(f"保存訊息成功: ID={message.id}, 發送者={user.nickname}, 內容={content[:20]}...")
            
            return message
        except ChatRoom.DoesNotExist:
            logger.error(f"聊天室不存在: {room_id}")
            return None
        except Exception as e:
            logger.error(f"保存訊息時發生錯誤: {str(e)}")
            return None
    
    @database_sync_to_async
    def recall_message(self, message_id, user_id):
        """收回訊息"""
        # 延遲匯入模型，確保Django已完全初始化
        from .models import Message
        
        try:
            # 確保message_id是有效的UUID格式
            try:
                msg_uuid = uuid.UUID(str(message_id))
                message_id = str(msg_uuid)
            except ValueError:
                logger.error(f"訊息ID格式無效: {message_id}")
                return False
                
            message = Message.objects.get(id=message_id)
            
            # 檢查是否是訊息發送者
            if str(message.sender.user_id) != user_id:
                logger.error(f"用戶 {user_id} 嘗試收回不屬於自己的訊息 {message_id}")
                return False
            
            message.is_recalled = True
            message.save()
            logger.info(f"訊息已收回: {message_id}")
            return True
        except Message.DoesNotExist:
            logger.error(f"訊息不存在: {message_id}")
            return False
        except Exception as e:
            logger.error(f"收回訊息時發生錯誤: {str(e)}")
            return False
    
    @database_sync_to_async
    def delete_message(self, message_id, user_id):
        """刪除訊息"""
        # 延遲匯入模型，確保Django已完全初始化
        from .models import Message
        
        try:
            # 確保message_id是有效的UUID格式
            try:
                msg_uuid = uuid.UUID(str(message_id))
                message_id = str(msg_uuid)
            except ValueError:
                logger.error(f"訊息ID格式無效: {message_id}")
                return False
                
            message = Message.objects.get(id=message_id)
            
            # 檢查是否是訊息發送者
            if str(message.sender.user_id) != user_id:
                logger.error(f"用戶 {user_id} 嘗試刪除不屬於自己的訊息 {message_id}")
                return False
            
            message.is_deleted = True
            message.save()
            logger.info(f"訊息已標記為刪除: {message_id}")
            return True
        except Message.DoesNotExist:
            logger.error(f"訊息不存在: {message_id}")
            return False
        except Exception as e:
            logger.error(f"刪除訊息時發生錯誤: {str(e)}")
            return False
    
    @database_sync_to_async
    def update_chat_room_inactive(self, room_id):
        """將聊天室標記為非活躍"""
        # 延遲匯入模型，確保Django已完全初始化
        from .models import ChatRoom
        
        try:
            chat_room = ChatRoom.objects.get(room_id=room_id)
            chat_room.active = False
            chat_room.save()
            logger.info(f"聊天室已標記為非活躍: {room_id}")
            return True
        except ChatRoom.DoesNotExist:
            logger.error(f"聊天室不存在: {room_id}")
            return False
        except Exception as e:
            logger.error(f"更新聊天室狀態時發生錯誤: {str(e)}")
            return False
