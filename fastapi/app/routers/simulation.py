"""シミュレーションAPI（スタブ）"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

from app.services.simulation_engine import SimulationEngine
from app.services.rails_api_service import RailsApiService
from app.chains.simulation_chain import SimulationChain


class Location(BaseModel):
    lng: float = Field(..., description="経度")
    lat: float = Field(..., description="緯度")


class RunSimulationRequest(BaseModel):
    user_query: Optional[str] = Field(None, description="ユーザークエリ（任意）")
    hazard: str = Field("tsunami", description="ハザード種別")
    area: Optional[Dict[str, Any]] = Field(None, description="対象エリア（GeoJSON Polygon/BBox）")
    start_points: Optional[List[Location]] = Field(None, description="出発点の配列")
    shelter_pref: str = Field("rails-first", description="避難所優先度")
    time: Optional[str] = Field(None, description="ISO日時")


class RunSimulationResponse(BaseModel):
    success: bool
    geojson: Dict[str, Any]
    metadata: Dict[str, Any]


router = APIRouter()


@router.post("/run", response_model=RunSimulationResponse)
async def run_simulation(request: RunSimulationRequest):
    try:
        # 判定チェーン（任意）
        chain = SimulationChain()
        decision = await chain.determine_simulation(request.user_query or "")
        if not decision.get("should_run", True):
            raise HTTPException(status_code=400, detail="シミュレーションの必要性が低いと判定されました")

        # 避難所データを収集（Rails優先、足りなければGMAPSは将来拡張）
        rails = RailsApiService()
        shelters: List[Dict[str, Any]] = []

        # RailsのGeoJSON APIから避難所を収集する想定（レイヤ命名規約は後続で調整）
        try:
            geojson_index = rails.make_request("GET", "/api/geo_json_data")
            # 簡易にPointタイプの最初のデータを使う（将来: name=\"shelter\" 等の規約）
            if geojson_index:
                for item in geojson_index:
                    if item.get("data_type") == "Point":
                        # 詳細は /api/geo_json_data/:id などが理想だが
                        # ここではファイルパスから直接GeoJSONを読む構成ではないため、Rails API拡張を想定
                        # ひとまず座標が取れないためダミーを投入（スタブ）
                        shelters.append({"lng": 140.106, "lat": 35.608, "name": "避難所(仮)", "source": "rails"})
                        break
        except Exception:
            # Railsが取得できない場合はダミー
            shelters.append({"lng": 140.106, "lat": 35.608, "name": "避難所(仮)", "source": "rails"})

        # 出発点が未指定ならダミー
        start_points = request.start_points or [Location(lng=140.12, lat=35.6)]

        engine = SimulationEngine()
        geojson = await engine.run_evacuation_tsunami(
            hazard=request.hazard,
            area=request.area,
            start_points=[{"lng": p.lng, "lat": p.lat} for p in start_points],
            shelters=shelters,
            time_iso=request.time,
        )

        return RunSimulationResponse(
            success=True,
            geojson=geojson,
            metadata={
                "hazard": request.hazard,
                "shelter_pref": request.shelter_pref,
                "start_points": [p.dict() for p in start_points],
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")


