"""Google Maps APIルーター"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    SearchPlacesRequest,
    DirectionsRequest,
    GeocodeRequest,
    QueryGeneratorRequest,
    GoogleMapsResponse,
    QueryGeneratorResponse
)
from app.services.google_maps_service import GoogleMapsService
from app.chains.query_generator_chain import QueryGeneratorChain

router = APIRouter()


@router.post("/search-places", response_model=GoogleMapsResponse)
async def search_places(request: SearchPlacesRequest):
    """Places API検索"""
    try:
        service = GoogleMapsService()
        
        location_param = None
        if request.location:
            location_param = {
                "lat": request.location.lat,
                "lng": request.location.lng
            }
        
        geojson_data = await service.search_places(
            query=request.query,
            location=location_param,
            radius=request.radius,
            type=request.type
        )
        
        if geojson_data:
            return GoogleMapsResponse(
                success=True,
                geojson=geojson_data,
                metadata={
                    "query": request.query,
                    "location": location_param,
                    "radius": request.radius,
                    "type": request.type,
                    "feature_count": len(geojson_data.get("features", []))
                }
            )
        else:
            return GoogleMapsResponse(
                success=False,
                geojson={"type": "FeatureCollection", "features": []},
                error="Places APIの呼び出しに失敗しました"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Places API error: {str(e)}")


@router.post("/directions", response_model=GoogleMapsResponse)
async def get_directions(request: DirectionsRequest):
    """Directions API（ルート計算）"""
    try:
        service = GoogleMapsService()
        
        geojson_data = await service.get_directions(
            origin=request.origin,
            destination=request.destination,
            mode=request.mode,
            alternatives=request.alternatives
        )
        
        if geojson_data:
            return GoogleMapsResponse(
                success=True,
                geojson=geojson_data,
                metadata={
                    "origin": request.origin,
                    "destination": request.destination,
                    "mode": request.mode,
                    "alternatives": request.alternatives,
                    "route_count": len(geojson_data.get("features", []))
                }
            )
        else:
            return GoogleMapsResponse(
                success=False,
                geojson={"type": "FeatureCollection", "features": []},
                error="Directions APIの呼び出しに失敗しました"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Directions API error: {str(e)}")


@router.post("/geocode", response_model=GoogleMapsResponse)
async def geocode(request: GeocodeRequest):
    """Geocoding API（住所から座標取得）"""
    try:
        service = GoogleMapsService()
        
        geojson_data = await service.geocode(address=request.address)
        
        if geojson_data:
            return GoogleMapsResponse(
                success=True,
                geojson=geojson_data,
                metadata={
                    "address": request.address,
                    "result_count": len(geojson_data.get("features", []))
                }
            )
        else:
            return GoogleMapsResponse(
                success=False,
                geojson={"type": "FeatureCollection", "features": []},
                error="Geocoding APIの呼び出しに失敗しました"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Geocoding API error: {str(e)}")


@router.post("/generate-query", response_model=QueryGeneratorResponse)
async def generate_query(request: QueryGeneratorRequest):
    """ユーザーの質問からGoogle Maps API用のクエリを生成"""
    try:
        chain = QueryGeneratorChain()
        query_data = await chain.generate_query(request.user_query)
        
        if query_data:
            return QueryGeneratorResponse(
                success=True,
                query_data=query_data
            )
        else:
            return QueryGeneratorResponse(
                success=False,
                error="クエリの生成に失敗しました"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query generation error: {str(e)}")

