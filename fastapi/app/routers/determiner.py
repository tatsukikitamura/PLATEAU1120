from fastapi import APIRouter, HTTPException
from app.models.schemas import DeterminerRequest, DeterminerResponse
from app.chains.determiner_chain import DeterminerChain

router = APIRouter()


@router.post("/google-maps", response_model=DeterminerResponse)
async def should_use_google_maps(request: DeterminerRequest):
    """Google Maps APIを使うべきかを判定"""
    try:
        chain = DeterminerChain()
        result = await chain.should_use_google_maps(request.user_query)
        
        return DeterminerResponse(result=result, success=True)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Determination error: {str(e)}")


@router.post("/map-display", response_model=DeterminerResponse)
async def should_display_on_map(request: DeterminerRequest):
    """マップに表示すべきかを判定"""
    try:
        chain = DeterminerChain()
        result = await chain.should_display_on_map(request.user_query)
        
        return DeterminerResponse(result=result, success=True)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Determination error: {str(e)}")

