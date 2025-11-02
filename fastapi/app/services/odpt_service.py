"""ODPT (Public Transportation Open Data Challenge) APIサービス"""
import httpx
import asyncio
from typing import Optional, Dict, Any, List


class OdptService:
    """ODPT APIを呼び出してデータを処理するサービス"""
    
    DEFAULT_TIMEOUT = 15
    RETRIES = 2
    STATION_ENDPOINT = "odpt:Station"
    SURVEY_ENDPOINT = "odpt:PassengerSurvey"
    
    def __init__(self):
        from app.config import settings
        self.base_url = settings.odpt_base_url
        if not self.base_url.endswith("/"):
            self.base_url += "/"
        self.consumer_key = settings.odpt_api_key
        if not self.consumer_key:
            raise ValueError("ODPT_API_KEY環境変数が必要です")
    
    async def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """ODPT APIにGETリクエストを送信"""
        if params is None:
            params = {}
        
        params["acl:consumerKey"] = self.consumer_key
        
        url = f"{self.base_url}{path}"
        
        attempt = 0
        while attempt < self.RETRIES:
            try:
                attempt += 1
                async with httpx.AsyncClient(timeout=self.DEFAULT_TIMEOUT) as client:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    return response.json()
            except httpx.HTTPError as e:
                if attempt >= self.RETRIES:
                    print(f"ODPT GET error (attempt {attempt}): {e}")
                    raise
                print(f"ODPT GET error (attempt {attempt}): {e}, retrying...")
    
    async def fetch_joined_stations(
        self,
        year: Optional[int] = None,
        operator: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """駅と乗降客調査データを結合して返す"""
        # パラメータを構築
        station_params = {}
        survey_params = {}
        
        if operator:
            station_params["odpt:operator"] = operator
        
        if year:
            survey_params["odpt:surveyYear"] = year
        
        # 並列でAPI呼び出し
        stations, surveys = await asyncio.gather(
            self.get(self.STATION_ENDPOINT, station_params),
            self.get(self.SURVEY_ENDPOINT, survey_params)
        )
        
        # 駅データを辞書に変換
        station_by_id = {}
        for s in stations:
            same_as = s.get("owl:sameAs") or s.get("@id")
            if not same_as:
                continue
            
            entry = {
                "id": same_as,
                "title": s.get("dc:title"),
                "code": s.get("odpt:stationCode"),
                "operator": s.get("odpt:operator"),
                "railway": s.get("odpt:railway"),
                "geo": self._extract_point(s)
            }
            
            station_by_id[same_as] = entry
            if s.get("@id") and s.get("@id") != same_as:
                station_by_id[s.get("@id")] = entry
        
        # 調査データを駅データに結合
        for sv in surveys:
            survey_year = sv.get("odpt:surveyYear")
            
            # 1) Flat form
            flat_ids = sv.get("odpt:station")
            if isinstance(flat_ids, str):
                flat_ids = [flat_ids]
            elif not isinstance(flat_ids, list):
                flat_ids = []
            
            flat_value = sv.get("odpt:passengerJourneys") or sv.get("odpt:annualPassengers") or sv.get("odpt:dailyPassengers")
            if flat_ids and flat_value:
                for sid in flat_ids:
                    st = station_by_id.get(sid)
                    if not st:
                        continue
                    if "survey" not in st:
                        st["survey"] = {"year": survey_year, "value": 0}
                    st["survey"]["value"] += int(flat_value)
            
            # 2) Nested form (array of objects)
            for key in ["odpt:surveyObject", "odpt:passengerSurveyObject", "odpt:objects"]:
                if key not in sv:
                    continue
                objs = sv[key]
                if not isinstance(objs, list):
                    continue
                
                for obj in objs:
                    sid = obj.get("odpt:station")
                    val = obj.get("odpt:passengerJourneys") or obj.get("odpt:annualPassengers") or obj.get("odpt:dailyPassengers")
                    if not sid or not val:
                        continue
                    st = station_by_id.get(sid)
                    if not st:
                        continue
                    if "survey" not in st:
                        st["survey"] = {"year": survey_year, "value": 0}
                    st["survey"]["value"] += int(val)
        
        return list(station_by_id.values())
    
    def time_slot_weight(self, slot: str) -> float:
        """時間帯による重み付け（0..1）"""
        slot_map = {
            "morning": 1.0,
            "noon": 0.6,
            "evening": 0.9
        }
        return slot_map.get(slot, 0.7)
    
    def _extract_point(self, station_hash: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """駅データから座標を抽出"""
        lat = station_hash.get("geo:lat")
        lon = station_hash.get("geo:long")
        
        if lat and lon:
            return {"lat": float(lat), "lon": float(lon)}
        
        region = station_hash.get("ug:region")
        if isinstance(region, dict):
            coords = region.get("coordinates")
            if isinstance(coords, list) and len(coords) >= 2:
                lon2, lat2 = coords[0], coords[1]
                return {"lat": float(lat2), "lon": float(lon2)}
        
        return None

