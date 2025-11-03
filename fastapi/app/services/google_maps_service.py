"""Google Maps APIサービス"""
import httpx
from typing import Optional, Dict, Any, List
from app.config import settings


class GoogleMapsService:
    """Google Maps APIを呼び出してGeoJSONに変換するサービス"""
    
    BASE_URL = "https://maps.googleapis.com/maps/api"
    
    def __init__(self):
        self.api_key = settings.google_maps_api_key
        if not self.api_key:
            raise ValueError("GOOGLE_MAPS_API_KEY環境変数が必要です")
    
    async def search_places(
        self,
        query: str,
        location: Optional[Dict[str, float]] = None,
        radius: int = 5000,
        type: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Places API検索"""
        params = {
            "query": query,
            "key": self.api_key,
            "language": "ja"
        }
        
        if location:
            params["location"] = f"{location['lat']},{location['lng']}"
        if radius:
            params["radius"] = radius
        if type:
            params["type"] = type
        
        response = await self._make_request("/place/textsearch/json", params)
        if not response:
            return None
        
        return self._places_to_geojson(response)
    
    async def get_directions(
        self,
        origin: str,
        destination: str,
        mode: str = "driving",
        alternatives: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Directions API（ルート計算）"""
        params = {
            "origin": origin,
            "destination": destination,
            "mode": mode,
            "alternatives": alternatives,
            "key": self.api_key,
            "language": "ja"
        }
        
        response = await self._make_request("/directions/json", params)
        if not response:
            return None
        
        return self._directions_to_geojson(response)
    
    async def geocode(self, address: str) -> Optional[Dict[str, Any]]:
        """Geocoding API（住所から座標取得）"""
        params = {
            "address": address,
            "key": self.api_key,
            "language": "ja"
        }
        
        response = await self._make_request("/geocode/json", params)
        if not response:
            return None
        
        return self._geocoding_to_geojson(response)
    
    def _places_to_geojson(self, places_response: Dict[str, Any]) -> Dict[str, Any]:
        """Places APIレスポンスをGeoJSONに変換"""
        if "results" not in places_response:
            return self._create_empty_geojson()
        
        features = []
        for place in places_response["results"]:
            location = place.get("geometry", {}).get("location")
            if not location:
                continue
            
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [location["lng"], location["lat"]]  # GeoJSONは[経度, 緯度]
                },
                "properties": {
                    "name": place.get("name"),
                    "place_id": place.get("place_id"),
                    "rating": place.get("rating"),
                    "price_level": place.get("price_level"),
                    "types": place.get("types"),
                    "vicinity": place.get("vicinity"),
                    "formatted_address": place.get("formatted_address")
                }
            })
        
        return {
            "type": "FeatureCollection",
            "features": features
        }
    
    def _directions_to_geojson(self, directions_response: Dict[str, Any]) -> Dict[str, Any]:
        """Directions APIレスポンスをGeoJSONに変換"""
        if "routes" not in directions_response:
            return self._create_empty_geojson()
        
        features = []
        for index, route in enumerate(directions_response["routes"]):
            coordinates = self._extract_route_coordinates(route)
            if not coordinates:
                continue
            
            legs = []
            for leg in route.get("legs", []):
                legs.append({
                    "distance": leg.get("distance"),
                    "duration": leg.get("duration"),
                    "start_address": leg.get("start_address"),
                    "end_address": leg.get("end_address")
                })
            
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates
                },
                "properties": {
                    "route_index": index,
                    "summary": route.get("summary"),
                    "legs": legs
                }
            })
        
        return {
            "type": "FeatureCollection",
            "features": features
        }
    
    def _geocoding_to_geojson(self, geocoding_response: Dict[str, Any]) -> Dict[str, Any]:
        """Geocoding APIレスポンスをGeoJSONに変換"""
        if "results" not in geocoding_response:
            return self._create_empty_geojson()
        
        features = []
        for result in geocoding_response["results"]:
            location = result.get("geometry", {}).get("location")
            if not location:
                continue
            
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [location["lng"], location["lat"]]
                },
                "properties": {
                    "formatted_address": result.get("formatted_address"),
                    "place_id": result.get("place_id"),
                    "types": result.get("types"),
                    "address_components": result.get("address_components")
                }
            })
        
        return {
            "type": "FeatureCollection",
            "features": features
        }
    
    def _extract_route_coordinates(self, route: Dict[str, Any]) -> List[List[float]]:
        """ルートの座標配列を抽出"""
        coordinates = []
        
        for leg in route.get("legs", []):
            for step in leg.get("steps", []):
                polyline = step.get("polyline", {})
                encoded = polyline.get("points")
                if encoded:
                    step_coords = self._decode_polyline(encoded)
                    coordinates.extend(step_coords)
        
        return coordinates
    
    def _decode_polyline(self, encoded: str) -> List[List[float]]:
        """Google Polylineをデコード"""
        if not encoded:
            return []
        
        try:
            # polylineライブラリを使用（インストールが必要: pip install polyline）
            try:
                import polyline
                points = polyline.decode(encoded)
                # [lat, lng]の配列を[lng, lat]のGeoJSON形式に変換
                return [[lng, lat] for lat, lng in points]
            except ImportError:
                # polylineライブラリがインストールされていない場合はフォールバック
                print("Warning: polyline library not found. Using fallback decoder.")
                return self._decode_polyline_simple(encoded)
        except Exception as e:
            print(f"Polyline decode error: {e}")
            return []
    
    def _decode_polyline_simple(self, encoded: str) -> List[List[float]]:
        """シンプルなPolylineデコード実装（フォールバック）"""
        # 基本的な実装（完全ではない）
        # 本番ではpolylineライブラリを使用することを推奨
        coordinates = []
        index = 0
        lat = 0
        lng = 0
        
        while index < len(encoded):
            shift = 0
            result = 0
            while True:
                b = ord(encoded[index]) - 63 - 1
                index += 1
                result |= (b & 0x1f) << shift
                shift += 5
                if b < 0x20:
                    break
            
            dlat = ~(result >> 1) if result & 1 else (result >> 1)
            lat += dlat
            
            shift = 0
            result = 0
            while True:
                b = ord(encoded[index]) - 63 - 1
                index += 1
                result |= (b & 0x1f) << shift
                shift += 5
                if b < 0x20:
                    break
            
            dlng = ~(result >> 1) if result & 1 else (result >> 1)
            lng += dlng
            
            coordinates.append([lng / 1e5, lat / 1e5])
        
        return coordinates
    
    def _create_empty_geojson(self) -> Dict[str, Any]:
        """空のGeoJSONを作成"""
        return {
            "type": "FeatureCollection",
            "features": []
        }
    
    async def _make_request(self, endpoint: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """HTTPリクエストを実行"""
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=30.0)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            print(f"Google Maps API error: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error in Google Maps API: {e}")
            return None

