from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class Message(BaseModel):
    """チャットメッセージ"""
    role: str = Field(..., description="メッセージの役割（system, user, assistant）")
    content: str = Field(..., description="メッセージの内容")


class GeoJsonDataInfo(BaseModel):
    """GeoJSONデータ情報"""
    name: str = Field(..., description="データ名")
    data_type: str = Field(..., description="データ型")
    schema_summary: Optional[Dict[str, Any]] = Field(
        None, 
        description="スキーマ概要（プロパティ情報を含む）"
    )


class ChatRequest(BaseModel):
    """チャットリクエスト"""
    messages: List[Message] = Field(..., description="チャットメッセージのリスト")
    session_id: Optional[str] = Field(None, description="セッションID（メモリー管理用）")
    selected_data: Optional[List[GeoJsonDataInfo]] = Field(None, description="選択されたデータ情報")
    system_prompt: Optional[str] = Field(None, description="カスタムシステムプロンプト")


class ChatResponse(BaseModel):
    """チャットレスポンス"""
    response: str = Field(..., description="AIからの応答")
    success: bool = Field(True, description="成功フラグ")


class DataSelectionRequest(BaseModel):
    """データ選択リクエスト"""
    user_query: str = Field(..., description="ユーザーの質問")
    available_data: Optional[List[GeoJsonDataInfo]] = Field(
        None, 
        description="利用可能なデータリスト（省略時はRails APIから取得）"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "summary": "available_dataを省略（Rails APIから取得）",
                    "description": "available_dataを省略すると、Rails APIから自動的にデータを取得します",
                    "value": {
                        "user_query": "千葉市の鉄道はどこですか？"
                    }
                },
                {
                    "summary": "available_dataを指定",
                    "description": "available_dataを指定すると、そのデータを使用します",
                    "value": {
                        "user_query": "千葉市の鉄道はどこですか？",
                        "available_data": [
                            {
                                "name": "railway",
                                "data_type": "MultiLineString",
                                "schema_summary": {
                                    "properties": {
                                        "railwayCategory": {
                                            "type": "string",
                                            "description": "鉄道種別",
                                            "samples": ["新幹線", "在来線"]
                                        },
                                        "lineName": {
                                            "type": "string",
                                            "description": "路線名",
                                            "samples": ["総武線", "京葉線"]
                                        }
                                    }
                                }
                            },
                            {
                                "name": "park",
                                "data_type": "Point",
                                "schema_summary": {
                                    "properties": {
                                        "parkName": {
                                            "type": "string",
                                            "description": "公園名",
                                            "samples": ["中央公園", "若葉公園"]
                                        },
                                        "parkType": {
                                            "type": "string",
                                            "description": "公園種別",
                                            "samples": ["街区公園", "地区公園"]
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            ]
        }
    }


class DataSelectionResponse(BaseModel):
    """データ選択レスポンス"""
    selected_data: List[str] = Field(..., description="選択されたデータ名のリスト")
    success: bool = Field(True, description="成功フラグ")


class DeterminerRequest(BaseModel):
    """判定リクエスト"""
    user_query: str = Field(..., description="ユーザーの質問")


class GoogleMapsDetermination(BaseModel):
    """Google Maps判定結果"""
    should_use: bool = Field(..., description="Google Maps APIを使用すべきか")
    reason: Optional[str] = Field(None, description="判定理由")


class MapDisplayDetermination(BaseModel):
    """マップ表示判定結果"""
    should_display: bool = Field(..., description="マップに表示すべきか")
    reason: Optional[str] = Field(None, description="判定理由")


class DeterminerResponse(BaseModel):
    """判定レスポンス"""
    result: bool = Field(..., description="判定結果")
    success: bool = Field(True, description="成功フラグ")


# Google Maps API関連のスキーマ
class LocationParam(BaseModel):
    """位置情報パラメータ"""
    lat: float = Field(..., description="緯度")
    lng: float = Field(..., description="経度")


class SearchPlacesRequest(BaseModel):
    """Places API検索リクエスト"""
    query: str = Field(..., description="検索クエリ")
    location: Optional[LocationParam] = Field(None, description="位置情報（lat, lng）")
    radius: int = Field(5000, description="検索半径（メートル）")
    type: Optional[str] = Field(None, description="場所のタイプ")


class DirectionsRequest(BaseModel):
    """Directions APIリクエスト"""
    origin: str = Field(..., description="出発地")
    destination: str = Field(..., description="目的地")
    mode: str = Field("driving", description="移動手段（driving, walking, bicycling, transit）")
    alternatives: bool = Field(False, description="代替ルートを含むか")


class GeocodeRequest(BaseModel):
    """Geocoding APIリクエスト"""
    address: str = Field(..., description="住所")


class QueryGeneratorRequest(BaseModel):
    """クエリ生成リクエスト"""
    user_query: str = Field(..., description="ユーザーの質問")


class GoogleMapsResponse(BaseModel):
    """Google Maps APIレスポンス"""
    success: bool = Field(True, description="成功フラグ")
    geojson: Dict[str, Any] = Field(..., description="GeoJSONデータ")
    metadata: Optional[Dict[str, Any]] = Field(None, description="メタデータ")
    error: Optional[str] = Field(None, description="エラーメッセージ")


class QueryGeneratorResponse(BaseModel):
    """クエリ生成レスポンス"""
    success: bool = Field(True, description="成功フラグ")
    query_data: Optional[Dict[str, Any]] = Field(None, description="生成されたクエリデータ")
    error: Optional[str] = Field(None, description="エラーメッセージ")


# ODPT API関連のスキーマ
class StationGeo(BaseModel):
    """駅の座標情報"""
    lat: Optional[float] = Field(None, description="緯度")
    lon: Optional[float] = Field(None, description="経度")


class StationSurvey(BaseModel):
    """乗降客調査情報"""
    year: Optional[int] = Field(None, description="調査年")
    value: int = Field(0, description="乗降客数")


class StationData(BaseModel):
    """駅データ"""
    id: str = Field(..., description="駅ID")
    title: Optional[str] = Field(None, description="駅名")
    code: Optional[str] = Field(None, description="駅コード")
    operator: Optional[str] = Field(None, description="運営事業者")
    railway: Optional[str] = Field(None, description="路線")
    geo: Optional[StationGeo] = Field(None, description="座標情報")
    survey: Optional[StationSurvey] = Field(None, description="乗降客調査情報")


class HeatmapPoint(BaseModel):
    """ヒートマップ用のポイントデータ"""
    id: str = Field(..., description="駅ID")
    title: Optional[str] = Field(None, description="駅名")
    lat: float = Field(..., description="緯度")
    lon: float = Field(..., description="経度")
    value: float = Field(..., description="重み付けされた乗降客数")


class OdptPassengerSurveyResponse(BaseModel):
    """ODPT乗降客調査レスポンス"""
    success: bool = Field(True, description="成功フラグ")
    data: List[Dict[str, Any]] = Field(..., description="駅と乗降客調査データ")
    error: Optional[str] = Field(None, description="エラーメッセージ")


class OdptPassengerHeatmapResponse(BaseModel):
    """ODPTヒートマップレスポンス"""
    success: bool = Field(True, description="成功フラグ")
    time_slot: str = Field(..., description="時間帯")
    data: List[Dict[str, Any]] = Field(..., description="ヒートマップ用データ")
    error: Optional[str] = Field(None, description="エラーメッセージ")

