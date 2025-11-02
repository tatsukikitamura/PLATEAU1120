from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatRequest, ChatResponse
from app.chains.chat_chain import ChatChain
from app.services.rails_api_service import RailsApiService

router = APIRouter()

# グローバルなRails APIサービスインスタンス
rails_api_service = RailsApiService()


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """チャットエンドポイント"""
    try:
        # チャットチェーンを作成
        chain = ChatChain(
            use_memory=True,
            session_id=request.session_id,
            rails_api_service=rails_api_service
        )
        
        # システムプロンプトを構築
        system_prompt = request.system_prompt
        
        # 選択されたデータがある場合はコンテキストに追加
        if request.selected_data:
            data_context = chain.build_data_context([
                {
                    "name": data.name,
                    "data_type": data.data_type,
                    "schema_summary": data.schema_summary or {}
                }
                for data in request.selected_data
            ])
            
            if system_prompt:
                system_prompt = f"{system_prompt}\n\n{data_context}"
            else:
                system_prompt = data_context
        
        # チャットを実行
        response = await chain.chat(
            messages=request.messages,
            system_prompt=system_prompt
        )
        
        return ChatResponse(response=response, success=True)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """セッションのメモリーをクリア"""
    from app.services.memory_service import memory_service
    
    try:
        memory_service.clear_memory(session_id)
        return {"success": True, "message": f"Session {session_id} cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing session: {str(e)}")

