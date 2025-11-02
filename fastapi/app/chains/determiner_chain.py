from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from app.services.llm_service import LLMService
from typing import Optional


class GoogleMapsDetermination(BaseModel):
    """Google Maps判定結果（Structured Output用）"""
    should_use: bool = Field(description="Google Maps APIを使用すべきか")
    reason: Optional[str] = Field(default=None, description="判定理由")


class MapDisplayDetermination(BaseModel):
    """マップ表示判定結果（Structured Output用）"""
    should_display: bool = Field(description="マップに表示すべきか")
    reason: Optional[str] = Field(default=None, description="判定理由")


class DeterminerChain:
    """判定チェーン（Google Maps判定、マップ表示判定）"""
    
    def __init__(self):
        self.llm_service = LLMService()
        self.llm = self.llm_service.get_deterministic_model()
        
        # Google Maps判定用プロンプト
        self.google_maps_prompt = ChatPromptTemplate.from_template(
            """あなたは千葉市の地理空間データを扱うAIアシスタントです。
ユーザーの質問内容を分析し、Google Maps API（Places検索、経路検索、住所検索）を使用する必要があるかを判断してください。

以下の場合は true を返してください：
- 店舗、レストラン、カフェ、ホテルなどの具体的な施設検索（「近くのレストラン」「カフェ」「コンビニ」など）
- 経路やルートの検索（「AからBまでの道順」「ルート検索」など）
- 住所から座標への変換が必要な質問
- 観光スポット、イベント会場などの検索
- 「どこにある」「位置を教えて」などの位置情報を求める質問（具体的地名を含む）

以下の場合は false を返してください：
- PLATEAUの地理空間データで答えられる質問（公園、駅、避難所など）
- 千葉市が管理するデータに関する質問（建物、道路、鉄道など）
- 統計情報、データ数の確認
- システムの使い方、操作方法
- 抽象的な質問（「観光地は？」など、具体的な施設名がない）

ユーザーの質問: {query}

この質問に回答するために、Google Maps API（Places、Directions、Geocoding）を使用する必要がありますか？
"""
        )
        
        # マップ表示判定用プロンプト
        self.map_display_prompt = ChatPromptTemplate.from_template(
            """あなたは千葉市の地理空間データを扱うAIアシスタントです。
ユーザーの質問内容を分析し、地理空間データを地図上に可視化する必要があるかを判断してください。

以下の場合は true を返してください：
- 公園、駅、避難所、ランドマークなどの具体的な場所に関する質問
- 「どこに」「場所」「位置」などの場所を聞く質問
- 「地図で見たい」「マップに表示」など地図表示を希望する質問
- 観光スポット、経路、ルートに関する質問
- 建物、道路、鉄道などの地理的データに関する質問

以下の場合は false を返してください：
- 使い方、操作方法、機能の説明に関する質問
- 統計情報、データ数の確認に関する質問
- 「フィルター」などの機能に関する質問
- 「何が」「何を」「どう」などの一般的な説明を求める質問

ユーザーの質問: {query}

この質問に回答するために、地理空間データを地図上に可視化する必要がありますか？
"""
        )
    
    async def should_use_google_maps(self, user_query: str) -> bool:
        """Google Maps APIを使うべきかを判定"""
        if not user_query:
            return False
        
        try:
            # Structured Outputを使用
            structured_llm = self.llm.with_structured_output(GoogleMapsDetermination)
            chain = self.google_maps_prompt | structured_llm
            
            result = await chain.ainvoke({"query": user_query})
            return result.should_use
            
        except Exception as e:
            print(f"Error in Google Maps determination: {e}")
            # エラー時はデフォルトでfalse
            return False
    
    async def should_display_on_map(self, user_query: str) -> bool:
        """マップに表示すべきかを判定"""
        if not user_query:
            return False
        
        try:
            # Structured Outputを使用
            structured_llm = self.llm.with_structured_output(MapDisplayDetermination)
            chain = self.map_display_prompt | structured_llm
            
            result = await chain.ainvoke({"query": user_query})
            
            # デバッグ用ログ追加
            print(f"[DEBUG] User query: {user_query}")
            print(f"[DEBUG] Result: {result}")
            print(f"[DEBUG] Should display: {result.should_display}")
            if result.reason:
                print(f"[DEBUG] Reason: {result.reason}")
            
            return result.should_display
            
        except Exception as e:
            print(f"Error in map display determination: {e}")
            import traceback
            traceback.print_exc()  # スタックトレースを出力
            # エラー時はデフォルトでfalse
            return False

