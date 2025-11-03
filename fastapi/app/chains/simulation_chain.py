"""シミュレーション判定チェーン（スタブ）

ユーザークエリから避難（津波）シミュレーションの実行可否と
抽出パラメータを返すための大枠。
"""

from typing import Any, Dict, Optional


class SimulationChain:
    """避難（津波）用の判定チェーン（スタブ）"""

    async def determine_simulation(self, user_query: str) -> Dict[str, Any]:
        """スタブ: 文面に『避難』『津波』などが含まれたら実行候補にする。

        返却例:
          {
            "should_run": True,
            "type": "evacuation",
            "hazard": "tsunami",
            "params": {
              "shelter_pref": "rails-first",
            }
          }
        """
        q = user_query or ""
        q_norm = q.lower()
        should = ("避難" in q) or ("tsunami" in q_norm) or ("津波" in q)
        return {
            "should_run": should,
            "type": "evacuation",
            "hazard": "tsunami",
            "params": {
                "shelter_pref": "rails-first",
            },
        }


