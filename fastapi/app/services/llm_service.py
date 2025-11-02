from langchain_openai import ChatOpenAI
from langchain_core.language_models import BaseChatModel
from app.config import settings


class LLMService:
    """LangChain LLMサービス"""
    
    def __init__(self):
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        
    def get_chat_model(self, temperature: float = 0.7) -> BaseChatModel:
        """チャット用のLangChain LLMを返す（標準温度）"""
        return ChatOpenAI(
            model=self.model,
            openai_api_key=self.api_key,
            temperature=temperature,
            timeout=60,
        )
    
    def get_deterministic_model(self) -> BaseChatModel:
        """判定用のLangChain LLMを返す（低温度で確定的な回答）"""
        return self.get_chat_model(temperature=0.1)

