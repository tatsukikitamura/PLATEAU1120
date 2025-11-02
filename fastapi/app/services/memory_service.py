from langchain_community.chat_message_histories import ChatMessageHistory
from typing import Dict, Optional


class MemoryWrapper:
    """ConversationBufferMemoryの互換性ラッパー"""
    
    def __init__(self, chat_history: ChatMessageHistory):
        self.chat_history = chat_history
    
    @property
    def chat_memory(self):
        """chat_memoryプロパティ（ConversationBufferMemory互換）"""
        return self.chat_history


class MemoryService:
    """チャットメモリー管理サービス"""
    
    def __init__(self):
        # セッションごとのメモリーを管理（本番環境ではRedis等を使用）
        self._memories: Dict[str, MemoryWrapper] = {}
    
    def get_memory(self, session_id: Optional[str] = None) -> MemoryWrapper:
        """セッションIDに対応するメモリーを取得（なければ新規作成）"""
        session_key = session_id or "default"
        
        if session_key not in self._memories:
            chat_history = ChatMessageHistory()
            self._memories[session_key] = MemoryWrapper(chat_history)
        
        return self._memories[session_key]
    
    def clear_memory(self, session_id: Optional[str] = None):
        """セッションのメモリーをクリア"""
        session_key = session_id or "default"
        if session_key in self._memories:
            del self._memories[session_key]
    
    def clear_all_memories(self):
        """すべてのメモリーをクリア"""
        self._memories.clear()


# グローバルインスタンス
memory_service = MemoryService()

