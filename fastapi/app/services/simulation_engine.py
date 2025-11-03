"""シミュレーションエンジン（スタブ実装）

津波を想定した避難シミュレーションの大枠のみ実装。
将来的に数理モデル/時系列計算を差し替え可能な構造にする。
"""

from typing import Any, Dict, List, Optional
from datetime import datetime


class SimulationEngine:
    """避難シミュレーション計算エンジン（スタブ）"""

    async def run_evacuation_tsunami(
        self,
        hazard: str,
        area: Optional[Dict[str, Any]],
        start_points: List[Dict[str, float]],
        shelters: List[Dict[str, Any]],
        time_iso: Optional[str] = None,
    ) -> Dict[str, Any]:
        """津波想定の避難シミュレーションを実行（スタブ）

        入力:
          - hazard: "tsunami" 固定想定
          - area: GeoJSONのPolygon/BBox相当（任意）
          - start_points: [{lng, lat}]
          - shelters: [{lng, lat, name, source}]
          - time_iso: 実行時刻

        出力:
          - GeoJSON FeatureCollection（LineString=簡易経路, Point=避難所, Polygon=危険域ダミー）
        """
        run_id = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")

        # 簡易に: 各出発点から最も近い避難所へ直線で結ぶLineStringを生成（スタブ）
        features: List[Dict[str, Any]] = []

        # 避難所Points
        for s in shelters[:20]:
            features.append(
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [s["lng"], s["lat"]],
                    },
                    "properties": {
                        "name": s.get("name"),
                        "source": s.get("source", "rails"),
                        "kind": "shelter",
                    },
                }
            )

        # 危険域（ダミーの小さなPolygon）
        if start_points:
            lng = start_points[0]["lng"]
            lat = start_points[0]["lat"]
            danger_poly = {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [lng - 0.002, lat - 0.002],
                            [lng + 0.002, lat - 0.002],
                            [lng + 0.002, lat + 0.002],
                            [lng - 0.002, lat + 0.002],
                            [lng - 0.002, lat - 0.002],
                        ]
                    ],
                },
                "properties": {
                    "hazard": hazard,
                    "kind": "danger_zone",
                    "note": "dummy polygon",
                },
            }
            features.append(danger_poly)

        # 簡易経路（直線）
        if shelters:
            for sp in start_points[:10]:
                # 先頭の避難所を仮の目的地とする
                dst = shelters[0]
                features.append(
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [
                                [sp["lng"], sp["lat"]],
                                [dst["lng"], dst["lat"]],
                            ],
                        },
                        "properties": {
                            "eta_min": 10,
                            "risk": "medium",
                            "mode": "walk",
                            "kind": "evac_route",
                        },
                    }
                )

        return {
            "type": "FeatureCollection",
            "features": features,
        }


