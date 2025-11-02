import httpx
from typing import List, Dict, Any, Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class RailsApiService:
    """Rails API呼び出しサービス"""
    
    def __init__(self):
        self.base_url = settings.rails_api_url.rstrip('/')
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """クライアントをクローズ"""
        await self.client.aclose()
    
    async def get_geo_json_data_list(
        self, 
        data_type: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """GeoJSONデータリストを取得"""
        try:
            params = {}
            if data_type:
                params['data_type'] = data_type
            if search:
                params['search'] = search
            
            url = f"{self.base_url}/api/geo_json_data"
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            # Rails APIのレスポンス形式: { "data": [...], "meta": {...} }
            if isinstance(data, dict) and "data" in data:
                return data["data"]
            
            return []
            
        except httpx.HTTPError as e:
            logger.error(f"Rails API呼び出しエラー: {e}")
            logger.error(f"URL: {url}")
            logger.error(f"エラー詳細: {str(e)}")
            return []
        except httpx.ConnectError as e:
            logger.error(f"Rails API接続エラー: {e}")
            logger.error(f"URL: {url}")
            logger.error(f"接続に失敗しました。Rails APIが起動しているか確認してください。")
            return []
        except Exception as e:
            logger.error(f"予期しないエラー: {e}")
            logger.error(f"エラー詳細: {type(e).__name__}: {str(e)}")
            return []
    
    async def get_geo_json_data(self, data_id: int) -> Optional[Dict[str, Any]]:
        """特定のGeoJSONデータを取得"""
        try:
            url = f"{self.base_url}/api/geo_json_data/{data_id}"
            response = await self.client.get(url)
            response.raise_for_status()
            
            data = response.json()
            
            # Rails APIのレスポンス形式を確認
            if isinstance(data, dict):
                if "data" in data:  # render_success形式
                    return data["data"].get("geo_json_data")
                return data
            
            return None
            
        except httpx.HTTPError as e:
            logger.error(f"Rails API呼び出しエラー: {e}")
            logger.error(f"URL: {url}")
            return None
        except httpx.ConnectError as e:
            logger.error(f"Rails API接続エラー: {e}")
            logger.error(f"URL: {url}")
            logger.error(f"接続に失敗しました。Rails APIが起動しているか確認してください。")
            return None
        except Exception as e:
            logger.error(f"予期しないエラー: {e}")
            logger.error(f"エラー詳細: {type(e).__name__}: {str(e)}")
            return None
    
    async def get_geo_json_data_statistics(self) -> Dict[str, Any]:
        """GeoJsonDataの統計情報を取得"""
        try:
            url = f"{self.base_url}/api/geo_json_data/statistics"
            response = await self.client.get(url)
            response.raise_for_status()
            
            data = response.json()
            
            # Rails APIのレスポンス形式: { "overall": {...}, "by_data_type": {...} }
            if isinstance(data, dict):
                return data
            
            return {}
            
        except httpx.HTTPError as e:
            logger.error(f"Rails API呼び出しエラー: {e}")
            logger.error(f"URL: {url}")
            return {}
        except httpx.ConnectError as e:
            logger.error(f"Rails API接続エラー: {e}")
            logger.error(f"URL: {url}")
            logger.error(f"接続に失敗しました。Rails APIが起動しているか確認してください。")
            return {}
        except Exception as e:
            logger.error(f"予期しないエラー: {e}")
            logger.error(f"エラー詳細: {type(e).__name__}: {str(e)}")
            return {}
    
    async def get_all_geo_json_data(self, visible_only: bool = True) -> List[Dict[str, Any]]:
        """全GeoJsonDataを取得"""
        # 既存のget_geo_json_data_listを使用（visible_onlyはRails側でデフォルトでvisibleのみ返す）
        return await self.get_geo_json_data_list()
    
    async def get_geo_json_data_by_type(self, data_type: str) -> List[Dict[str, Any]]:
        """データ型でフィルタリングしてGeoJSONデータを取得"""
        return await self.get_geo_json_data_list(data_type=data_type)
    
    def convert_rails_data_to_fastapi_format(
        self, 
        rails_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Rails APIのデータ形式をFastAPI形式に変換"""
        converted = []
        
        for item in rails_data:
            # Rails APIのレスポンス形式を想定
            # GeoJsonDataモデルのas_json形式
            converted_item = {
                "name": item.get("name", ""),
                "data_type": item.get("data_type", ""),
                "schema_summary": None
            }
            
            # schema_summaryが文字列の場合はJSONパース
            schema_summary = item.get("schema_summary")
            if schema_summary:
                if isinstance(schema_summary, str):
                    try:
                        import json
                        converted_item["schema_summary"] = json.loads(schema_summary)
                    except json.JSONDecodeError:
                        converted_item["schema_summary"] = None
                elif isinstance(schema_summary, dict):
                    converted_item["schema_summary"] = schema_summary
            
            converted.append(converted_item)
        
        return converted

