from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import chat, data_selector, determiner, google_maps, odpt
from app.routers import simulation

# FastAPIアプリケーションを作成
app = FastAPI(
    title="LangChain Geo Service",
    description="LangChainベースの地理空間データAIサービス",
    version="1.0.0"
)

# CORS設定（Railsアプリからアクセス可能に）
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターを登録
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(data_selector.router, prefix="/api/data-selector", tags=["data-selector"])
app.include_router(determiner.router, prefix="/api/determiner", tags=["determiner"])
app.include_router(google_maps.router, prefix="/api/google-maps", tags=["google-maps"])
app.include_router(odpt.router, prefix="/api/odpt", tags=["odpt"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["simulation"])


@app.get("/")
async def root():
    """ヘルスチェックエンドポイント"""
    return {
        "service": "LangChain Geo Service",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    """ヘルスチェック"""
    return {"status": "healthy"}


