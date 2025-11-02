from fastapi import APIRouter, HTTPException
from app.models.schemas import DataSelectionRequest, DataSelectionResponse
from app.chains.data_selection_chain import DataSelectionChain
from app.services.rails_api_service import RailsApiService

router = APIRouter()

# グローバルなRails APIサービスインスタンス
rails_api_service = RailsApiService()


@router.post("/", response_model=DataSelectionResponse)
async def select_data(request: DataSelectionRequest):
    """データ選択エンドポイント"""
    try:
        # RailsApiServiceをDataSelectionChainに渡す
        chain = DataSelectionChain(rails_api_service=rails_api_service)
        
        # 利用可能なデータを取得
        # available_dataが指定されている場合はそれを使用、そうでない場合はNone（Rails APIから自動取得）
        available_data = None
        if request.available_data:
            # リクエストで指定された場合はそれを使用
            available_data = [
                {
                    "name": data.name,
                    "data_type": data.data_type,
                    "schema_summary": data.schema_summary or {}
                }
                for data in request.available_data
            ]
        
        # データ選択を実行（available_dataがNoneの場合はRails APIから自動取得）
        selected_names = await chain.select_data(
            user_query=request.user_query,
            available_data=available_data
        )
        
        return DataSelectionResponse(
            selected_data=selected_names,
            success=True
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data selection error: {str(e)}")

