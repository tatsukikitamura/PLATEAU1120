from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.runnables import RunnablePassthrough
from app.services.llm_service import LLMService
from app.services.memory_service import memory_service
from app.services.rails_api_service import RailsApiService
from typing import List, Optional, Dict
from app.models.schemas import Message


class ChatChain:
    """チャットチェーン"""
    
    def __init__(
        self, 
        use_memory: bool = True, 
        session_id: Optional[str] = None,
        rails_api_service: Optional[RailsApiService] = None
    ):
        self.llm_service = LLMService()
        self.llm = self.llm_service.get_chat_model()
        self.use_memory = use_memory
        self.session_id = session_id
        self.rails_api_service = rails_api_service or RailsApiService()
        
        # 基本システムプロンプト
        self.base_system_prompt = """あなたは千葉市の地理空間データを分析するAIアシスタントです。
ユーザーの質問に対して、提供されたデータ情報に基づいて回答してください。

提供されるデータタイプ:
- Point: ポイントデータ（公園、駅など）
- MultiLineString: ラインデータ（道路、鉄道など）
- 3DTiles: 3D建物モデル
- OSM: OSM建物データ

回答は日本語で、簡潔に説明してください。"""
    
    def build_system_prompt(self, custom_prompt: Optional[str] = None) -> str:
        """システムプロンプトを構築"""
        if custom_prompt:
            return f"{self.base_system_prompt}\n\n追加情報:\n{custom_prompt}"
        return self.base_system_prompt
    
    def format_messages(self, messages: List[Message], system_prompt: Optional[str] = None) -> List[Dict[str, str]]:
        """メッセージをフォーマット"""
        # システムプロンプトを構築
        full_system_prompt = self.build_system_prompt(system_prompt)
        
        # messagesを辞書形式に変換
        formatted = []
        
        # 既にsystemメッセージがあるかチェック
        has_system = any(msg.role == "system" for msg in messages)
        
        # systemプロンプトがある場合は追加
        if not has_system and full_system_prompt:
            formatted.append({"role": "system", "content": full_system_prompt})
        
        # 既存のメッセージを追加
        for msg in messages:
            formatted.append({"role": msg.role, "content": msg.content})
        
        return formatted
    
    async def chat(self, messages: List[Message], system_prompt: Optional[str] = None) -> str:
        """チャットを実行"""
        from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
        
        # メッセージをフォーマット
        formatted_messages = self.format_messages(messages, system_prompt)
        
        # LangChainメッセージ形式に変換
        langchain_messages = []
        for msg in formatted_messages:
            if msg["role"] == "system":
                langchain_messages.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "user":
                langchain_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                langchain_messages.append(AIMessage(content=msg["content"]))
        
        # メモリーを使用する場合
        if self.use_memory:
            memory = memory_service.get_memory(self.session_id)
            
            # メモリーに履歴を追加（user/assistantメッセージのみ）
            for msg in langchain_messages:
                if isinstance(msg, HumanMessage):
                    memory.chat_memory.add_user_message(msg.content)
                elif isinstance(msg, AIMessage):
                    memory.chat_memory.add_ai_message(msg.content)
            
            # メモリーの履歴と最新のメッセージを結合
            chat_history = memory.chat_memory.messages
            # 最新のユーザーメッセージを取得
            last_user_msg = None
            for msg in reversed(langchain_messages):
                if isinstance(msg, HumanMessage):
                    last_user_msg = msg.content
                    break
            
            if last_user_msg:
                # メモリー付きでチェーンを実行
                full_messages = chat_history + [HumanMessage(content=last_user_msg)]
                response = await self.llm.ainvoke(full_messages)
                
                # AIの応答をメモリーに追加
                if hasattr(response, 'content'):
                    memory.chat_memory.add_ai_message(response.content)
                
                return response.content if hasattr(response, 'content') else str(response)
            else:
                # ユーザーメッセージがない場合は通常実行
                response = await self.llm.ainvoke(langchain_messages)
                return response.content
        else:
            # メモリーなしで直接実行
            response = await self.llm.ainvoke(langchain_messages)
            return response.content
    
    async def get_data_context(self) -> str:
        """地理空間データのコンテキスト情報を取得（Rails API経由）"""
        try:
            # Rails APIから統計情報を取得
            stats_data = await self.rails_api_service.get_geo_json_data_statistics()
            
            context = "データ統計情報:\n"
            
            if stats_data.get("overall"):
                overall = stats_data["overall"]
                context += f"- 総データ数: {overall.get('total', 0)}件\n"
                context += f"- 表示データ数: {overall.get('visible', 0)}件\n"
                context += f"- 非表示データ数: {overall.get('hidden', 0)}件\n"
            
            context += "\nデータタイプ別:\n"
            
            if stats_data.get("by_data_type"):
                by_type = stats_data["by_data_type"]
                for data_type, type_stats in by_type.items():
                    if isinstance(type_stats, dict):
                        context += f"  - {data_type}: 総数{type_stats.get('total', 0)}件、表示{type_stats.get('visible', 0)}件\n"
            
            # 各種データ型の詳細情報
            context += "\n利用可能なデータ:\n"
            
            # データ型のリスト（RailsのGeoJsonData::DATA_TYPES相当）
            data_types = ["Point", "MultiLineString", "3DTiles", "OSM"]
            
            for data_type in data_types:
                rails_data = await self.rails_api_service.get_geo_json_data_by_type(data_type)
                if rails_data:
                    names = [item.get("name", "") for item in rails_data if item.get("name")]
                    if names:
                        context += f"  - {data_type}: {', '.join(names)}\n"
            
            return context
            
        except Exception as e:
            print(f"Error getting data context: {e}")
            return "データ統計情報の取得に失敗しました。"
    
    def build_data_context(self, selected_data: List[Dict]) -> str:
        """選択されたデータのコンテキストを構築"""
        context = "選択されたデータ:\n"
        
        # データタイプごとにグループ化
        grouped_data = {}
        for data in selected_data:
            data_type = data.get("data_type", "unknown")
            if data_type not in grouped_data:
                grouped_data[data_type] = []
            grouped_data[data_type].append(data)
        
        # コンテキストを構築
        for data_type, records in grouped_data.items():
            context += f"\n【{data_type}】\n"
            for record in records:
                context += f"  - {record.get('name', 'unknown')}\n"
                
                # スキーマ情報を追加
                schema = record.get("schema_summary", {})
                if schema and isinstance(schema, dict):
                    if schema.get("feature_count"):
                        context += f"    件数: {schema['feature_count']}件\n"
                    
                    properties = schema.get("properties", {})
                    if properties:
                        for key, info in properties.items():
                            desc = info.get("description", key)
                            type_info = info.get("type", "unknown")
                            samples = info.get("samples", [])
                            samples_str = f"\n      例: {', '.join(samples)}" if samples else ""
                            context += f"    + {desc} ({type_info}){samples_str}\n"
        
        context += f"\n\n全体統計:\n"
        context += f"  - 選択されたデータ: {len(selected_data)}件\n"
        
        return context

