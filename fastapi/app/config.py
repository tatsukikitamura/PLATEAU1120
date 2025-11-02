from pydantic_settings import BaseSettings
from pydantic import field_validator, computed_field
from typing import List
import os


class Settings(BaseSettings):
    """アプリケーション設定"""
    # OpenAI API設定
    openai_api_key: str
    openai_model: str = "gpt-3.5-turbo"
    
    # Google Maps API設定
    google_maps_api_key: str = ""
    
    # ODPT API設定
    odpt_api_key: str = ""
    odpt_base_url: str = "https://api.odpt.org/api/v4/"
    
    # FastAPI設定
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Rails API設定
    rails_api_url: str = "http://localhost:3000"
    
    # CORS設定（環境変数からカンマ区切りで読み込み）
    # 文字列として定義し、プロパティでリストに変換
    cors_origins_str: str = "http://localhost:3000"
    
    @field_validator('cors_origins_str', mode='before')
    @classmethod
    def parse_cors_origins_str(cls, v):
        """CORS設定を文字列として受け取る"""
        if isinstance(v, str):
            return v
        if isinstance(v, list):
            return ",".join(v)
        return "http://localhost:3000"
    
    @computed_field
    @property
    def cors_origins(self) -> List[str]:
        """CORS設定をリストとして返す"""
        if isinstance(self.cors_origins_str, str):
            return [origin.strip() for origin in self.cors_origins_str.split(",") if origin.strip()]
        return ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        # 環境変数名のマッピング
        fields = {
            'cors_origins_str': {'env': 'CORS_ORIGINS'},
            'openai_api_key': {'env': 'OPENAI_API_KEY'},
            'openai_model': {'env': 'OPENAI_MODEL'},
            'google_maps_api_key': {'env': 'GOOGLE_MAPS_API_KEY'},
            'odpt_api_key': {'env': 'ODPT_API_KEY'},
            'odpt_base_url': {'env': 'ODPT_BASE_URL'},
            'rails_api_url': {'env': 'RAILS_API_URL'}
        }


# インスタンスを作成
settings = Settings()