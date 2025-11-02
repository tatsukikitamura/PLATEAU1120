# 観光向け実装プラン（PLATEAU-1120）

## 目的とスコープ
- 目的: 千葉市観光体験の質と回遊性を高める3D×AI観光プラットフォームを短期間で実装。
- スコープ（11/20まで）: 混雑可視化、パーソナライズルート、イベント連携、UIオンボーディングの最小有効実装。

---

## 機能要件（MVP）
1) 混雑可視化レイヤ
- 表示: スポットピンに混雑バッジ（低/中/高）、ヒートマップ切替
- 時間帯切替: 昼/夕/夜のタブ（3状態）
- 凡例: カラーテーブル（低=#4CAF50, 中=#FFC107, 高=#F44336）
- データ: ダミー初期値（手動JSON）→将来API差し替え

2) パーソナライズ観光ルート
- 入力: 興味タグ（歴史/自然/グルメ）重み合計=1.0、移動手段（徒歩/公共）
- スコア: score = Σ(tagWeight×spotTagScore) − congestionCost − detourPenalty
- 制約: 営業時間内、最大徒歩時間、合計滞在時間上限
- 出力: 立寄り順、所要時間/距離、見込み混雑、代替候補

3) イベント連携
- 表示: 今日/週末イベントのカード表示、地図ピン
- 操作: 行程に「挿入」→ルート再計算
- データ: ダミーJSON（名称/場所/開始・終了/推奨滞在）

4) お気に入り/ブックマーク
- 立寄り順の手動入替、再計算ボタン
- ローカル保存（localStorage）

5) AR導線（準備）
- スポット詳細に「ARで見る」ボタン（外部アプリ/別ページ遷移のプレースホルダ）

6) オンボーディング
- 初回ツアー（5ステップ）: レイヤ切替/検索/ルート生成/イベント挿入/保存
- 空状態: サンプル質問/サンプルルートの提示

---

## データ設計
- スポット: id, name, lat, lng, categories[history,nature,gourmet], open_hours, rating
- 混雑: spot_id, timeband{day/evening/night}, level{low,mid,high}
- イベント: id, title, lat, lng, start_at, end_at, duration_min, category
- ルート: waypoints[spot_id], total_time, total_distance, scores{user,congestion}

---

## API/エンドポイント（Rails想定）
- GET /api/spots?category=&bbox= -> スポット一覧
- GET /api/congestion?timeband= -> 混雑レベル（ダミー可）
- POST /api/routes/plan -> {origin, interests, timeband, transport, constraints} => 最適ルート
- GET /api/events?date=today|weekend -> イベント一覧

レスポンス例（routes/plan）
```json
{
  "waypoints": [
    {"id": 101, "name": "スポットA", "eta_min": 12},
    {"id": 205, "name": "スポットB", "eta_min": 28}
  ],
  "total_time_min": 85,
  "total_distance_km": 4.2,
  "score": 0.73,
  "alternatives": [/* 1-2件 */]
}
```

---

## ルーティングアルゴリズム（簡易仕様）
- 候補生成: 興味タグに合致する上位Nスポット（例: N=20）
- 評価関数: f(route) = Σ userInterestScore − Σ congestionCost − travelCost − timePenalty
- 制約充足: 営業時間、最大移動/滞在時間、開始/終了地点
- 解法: 貪欲＋2-optの軽量近似、代替案は上位3本保持

---

## フロントエンド実装（Cesium/Leaflet + JS）
- レイヤ:
  - 混雑: ピンバッジ/ヒートマップ（時帯切替）
  - イベント: アイコン差別化、クリックでカード
- ルートUI:
  - パネル: 興味スライダー（歴史/自然/グルメ）、移動手段、時間帯
  - 結果: 立寄り順カード、所要/距離、混雑比較、代替案タブ
- 保存: localStorageにお気に入り、行程の復元
- ツアー: ツールチップガイド（5ステップ）

---

## バックエンド実装（Rails）
- サービス: `Tourism::RoutePlannerService`（スコア計算/近似探索）
- コントローラ: `Api::Tourism::RoutesController`, `Api::Tourism::SpotsController`, `Api::Tourism::EventsController`, `Api::Tourism::CongestionController`
- データ供給: 初期は`public/data/GoogleAPI/`相当 or 固定JSON、後日差し替え
- キャッシュ: 混雑・イベントは短期キャッシュ（5-15分）

---

## UIコピー（下書き）
- ツアーステップ: 「混雑レイヤをON」「好みを選ぶ」「ルートを作成」「イベントを追加」「保存して共有」
- 空状態: 「例）“自然多めで3時間観光したい” と入力してみましょう」

---

## KPI（提出時に提示）
- 初見ユーザーがルート生成完了まで60秒以内
- 満足度4.2/5以上（社内モニタ）
- 混雑回避率30%以上（想定データに基づく試算）

---

## スケジュール
Week 1（〜11/3）
- 混雑レイヤ（UI/ダミーデータ）、基本ルート生成、イベント表示、オンボ初版

Week 2（〜11/10）
- ルート近似改善（2-opt）、代替案、ブックマーク、UI磨き、API整理

Week 3（〜11/17）
- パーソナライズ精度向上、コピー最終、パフォーマンス最適化

Week 4（〜11/20）
- 最終調整、3分動画/10P資料、安定化

---

## リスクと回避
- データ欠落: ダミー→差替容易なJSON/スキーマ統一
- 時間不足: コア機能優先（混雑/ルート/イベント）→ARは導線のみ
- パフォーマンス: レイヤ上限/LOD、差分再描画、APIキャッシュ


