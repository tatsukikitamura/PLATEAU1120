"""ODPT APIルーター"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.models.schemas import OdptPassengerSurveyResponse, OdptPassengerHeatmapResponse
from app.services.odpt_service import OdptService

router = APIRouter()


@router.get("/passenger-survey", response_model=OdptPassengerSurveyResponse)
async def passenger_survey(
    year: Optional[int] = Query(None, description="調査年"),
    operator: Optional[str] = Query(None, description="運営事業者")
):
    """乗降客調査データを取得"""
    try:
        service = OdptService()
        data = await service.fetch_joined_stations(year=year, operator=operator)
        
        return OdptPassengerSurveyResponse(
            success=True,
            data=data
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ODPT API error: {str(e)}")


@router.get("/passenger-heatmap", response_model=OdptPassengerHeatmapResponse)
async def passenger_heatmap(
    time_slot: str = Query("noon", description="時間帯（morning, noon, evening）"),
    year: Optional[int] = Query(None, description="調査年"),
    operator: Optional[str] = Query(None, description="運営事業者")
):
    """ヒートマップ用の乗降客データを取得"""
    try:
        service = OdptService()
        base = await service.fetch_joined_stations(year=year, operator=operator)
        weight = service.time_slot_weight(time_slot)
        
        heat = []
        for s in base:
            survey_value = s.get("survey", {}).get("value", 0) if s.get("survey") else 0
            value = survey_value * weight
            geo = s.get("geo")
            if geo and geo.get("lat") and geo.get("lon"):
                heat.append({
                    "id": s.get("id"),
                    "title": s.get("title"),
                    "lat": geo["lat"],
                    "lon": geo["lon"],
                    "value": value
                })
        
        return OdptPassengerHeatmapResponse(
            success=True,
            time_slot=time_slot,
            data=heat
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ODPT API error: {str(e)}")

