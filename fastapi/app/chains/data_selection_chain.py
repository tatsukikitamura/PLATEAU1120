from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from app.services.llm_service import LLMService
from app.services.rails_api_service import RailsApiService
from typing import List, Dict, Any, Optional
import json


class DataSelectionChain:
    """データ選択チェーン"""
    
    def __init__(self, rails_api_service: Optional[RailsApiService] = None):
        self.llm_service = LLMService()
        self.llm = self.llm_service.get_chat_model(temperature=0.3)  # データ選択は少し低めの温度
        self.rails_api_service = rails_api_service or RailsApiService()
        
        # プロンプトテンプレート
        self.prompt = ChatPromptTemplate.from_messages([
            SystemMessagePromptTemplate.from_template(
                "あなたは千葉市の地理空間データを分析するAIアシスタントです。"
                "ユーザーの質問に関連するデータを選択してください。"
                "データのプロパティ情報を参考にして、ユーザーの質問に最も適したデータを選択してください。"
            ),
            HumanMessagePromptTemplate.from_template(
                "利用可能なデータ:\n{data_list}\n\n"
                "ユーザーの質問: {user_query}\n\n"
                "この質問に関連するデータを選択してください。"
                "JSON形式で返してください: {{\"selected_data\": [\"data1\", \"data2\"]}}"
                "データ名のみを返してください。"
            )
        ])
    
    def format_data_list(self, available_data: List[Dict]) -> str:
        """データリストをフォーマット"""
        data_list_parts = []
        
        for data in available_data:
            name = data.get("name", "unknown")
            data_type = data.get("data_type", "unknown")
            schema_text = f"{name} ({data_type})"
            
            # スキーマ情報が存在する場合は追加
            schema = data.get("schema_summary")
            if schema and isinstance(schema, dict):
                properties = schema.get("properties", {})
                if properties:
                    prop_info = []
                    for key, info in properties.items():
                        desc = info.get("description", key)
                        type_info = info.get("type", "unknown")
                        samples = info.get("samples", [])
                        samples_str = f" 例: {', '.join(samples)}" if samples else ""
                        prop_info.append(f"- {desc} ({type_info}){samples_str}")
                    
                    schema_text += "\n  プロパティ:\n  " + "\n  ".join(prop_info)
            
            data_list_parts.append(schema_text)
        
        return "\n\n".join(data_list_parts)
    
    async def extract_keywords(self, message: str, all_data: Optional[List[Dict]] = None) -> List[tuple]:
        """キーワードを抽出"""
        keywords = []
        
        # データタイプのキーワードマッピング
        type_keywords = {
            "公園": ["park", "Point"],
            "パーク": ["park", "Point"],
            "park": ["park", "Point"],
            "ランドマーク": ["landmark", "Point"],
            "landmark": ["landmark", "Point"],
            "避難所": ["shelter", "Point"],
            "shelter": ["shelter", "Point"],
            "駅": ["station", "Point"],
            "ステーション": ["station", "Point"],
            "station": ["station", "Point"],
            "道路": ["border", "MultiLineString"],
            "border": ["border", "MultiLineString"],
            "避難路": ["emergency_route", "MultiLineString"],
            "emergency": ["emergency_route", "MultiLineString"],
            "鉄道": ["railway", "MultiLineString"],
            "railway": ["railway", "MultiLineString"],
            "建物": ["3DTiles", "OSM"],
            "building": ["3DTiles", "OSM"]
        }
        
        # 日本語キーワードマッチング
        message_lower = message.lower()
        for keyword, data_info in type_keywords.items():
            if keyword.lower() in message_lower:
                keywords.append(tuple(data_info))
        
        # 既存のデータ名と完全一致するかチェック
        # all_dataが提供されていない場合はRails APIから取得
        if all_data is None:
            rails_data = await self.rails_api_service.get_all_geo_json_data()
            all_data = self.rails_api_service.convert_rails_data_to_fastapi_format(rails_data)
        
        for data in all_data:
            data_name = data.get("name", "").lower()
            if data_name and data_name in message_lower:
                data_type = data.get("data_type", "")
                keywords.append((data_name, data_type))
        
        return keywords
    
    async def find_relevant_data(
        self, 
        keywords: List[tuple], 
        all_data: Optional[List[Dict]] = None
    ) -> List[Dict]:
        """関連データを検索"""
        if not keywords:
            return []
        
        # all_dataが提供されていない場合はRails APIから取得
        if all_data is None:
            rails_data = await self.rails_api_service.get_all_geo_json_data()
            all_data = self.rails_api_service.convert_rails_data_to_fastapi_format(rails_data)
        
        relevant_records = []
        
        for keyword_info in keywords:
            if not keyword_info or len(keyword_info) < 2:
                continue
            
            data_name = keyword_info[0]
            data_type = keyword_info[1]
            
            if data_type:
                # データ型でフィルタリング（Rails API経由で取得）
                rails_data = await self.rails_api_service.get_geo_json_data_by_type(data_type)
                type_matched = self.rails_api_service.convert_rails_data_to_fastapi_format(rails_data)
                
                for record in type_matched:
                    record_name = record.get("name", "").lower()
                    if data_name and data_name in record_name:
                        # 重複チェック
                        if not any(r.get("name") == record.get("name") for r in relevant_records):
                            relevant_records.append(record)
                
                # データ型がマッチした場合は全て追加（データ名が指定されていない場合）
                if not data_name:
                    for record in type_matched:
                        if not any(r.get("name") == record.get("name") for r in relevant_records):
                            relevant_records.append(record)
        
        return relevant_records
    
    async def select_data(
        self, 
        user_query: str, 
        available_data: Optional[List[Dict]] = None
    ) -> List[str]:
        """関連データを選択"""
        if not user_query:
            return []
        
        # キーワードマッチングで候補データを取得
        # available_dataが提供されている場合はそれを使用、そうでない場合はRails APIから取得
        keywords = await self.extract_keywords(user_query, available_data)
        candidate_data = await self.find_relevant_data(keywords, available_data)
        
        # 候補がない場合は空配列を返す（全データではなく）
        if not candidate_data:
            return []
        
        # available_dataが空の場合は空配列を返す
        if available_data is not None and len(available_data) == 0:
            return []
        
        # データリストをフォーマット
        data_list = self.format_data_list(candidate_data)
        
        # チェーンを実行
        try:
            chain = self.prompt | self.llm
            
            result = await chain.ainvoke({
                "user_query": user_query,
                "data_list": data_list
            })
            
            # JSONを抽出
            content = result.content if hasattr(result, 'content') else str(result)
            
            # JSONブロックを抽出
            json_match = None
            if isinstance(content, str):
                # JSONブロックを探す
                start_idx = content.find('{')
                end_idx = content.rfind('}') + 1
                if start_idx >= 0 and end_idx > start_idx:
                    json_str = content[start_idx:end_idx]
                    try:
                        json_match = json.loads(json_str)
                    except json.JSONDecodeError:
                        pass
            
            if json_match and "selected_data" in json_match:
                selected_names = json_match["selected_data"]
                
                # データ名から実際の候補データを取得して名前リストを返す
                # 候補データの中から選択されたデータのみを返す
                candidate_names = [data.get("name") for data in candidate_data if data.get("name")]
                valid_names = [name for name in selected_names if name in candidate_names]
                
                return valid_names if valid_names else []
            
            # JSON解析に失敗した場合は候補データの名前リストを返す
            print("JSON解析失敗、候補データを使用")
            return [data.get("name") for data in candidate_data if data.get("name")]
            
        except Exception as e:
            print(f"Error in data selection: {e}")
            return []

