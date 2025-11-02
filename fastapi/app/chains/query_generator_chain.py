"""Google Mapsクエリ生成チェーン"""
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_openai import ChatOpenAI
from app.config import settings
from typing import Dict, Any, Optional


class QueryGeneratorChain:
    """ユーザーの質問からGoogle Maps API用のクエリを生成するチェーン"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model=settings.openai_model,
            temperature=0.3,
            api_key=settings.openai_api_key
        )
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """あなたは千葉市の地理空間データを扱うAIアシスタントです。
ユーザーの質問から、Google Maps API（Places検索、Geocoding、Directions）に渡す適切な検索クエリを生成してください。

以下の形式でJSONを返してください：
{{
  "type": "places" または "geocode" または "directions",
  "query": "検索クエリや住所",
  "params": {{
    "origin": "出発地（directionsの場合）",
    "destination": "目的地（directionsの場合）"
  }}
}}

判定基準：
- 施設名やお店の名前を含む場合（例：「カフェ」「レストラン」「コンビニ」「公園」）→ type: "places"
- 住所や地名を探す場合（例：「千葉駅」「幕張メッセ」）→ type: "geocode"
- 経路やルートを求める場合（例：「から」「までの道順」「行き方」）→ type: "directions"

質問文から重要なキーワードだけを抽出してください。説明文は不要です。
千葉市に関連する質問のみを処理してください。"""),
            ("user", "ユーザーの質問: {user_query}\n\nGoogle Maps APIに渡す適切な検索クエリをJSON形式で返してください。")
        ])
        
        self.parser = JsonOutputParser()
    
    async def generate_query(self, user_query: str) -> Optional[Dict[str, Any]]:
        """ユーザーの質問からGoogle Maps API用のクエリを生成"""
        if not user_query:
            return None
        
        try:
            chain = self.prompt | self.llm | self.parser
            result = await chain.ainvoke({"user_query": user_query})
            return result
        except Exception as e:
            print(f"Error in query generation: {e}")
            import traceback
            traceback.print_exc()
            return None

