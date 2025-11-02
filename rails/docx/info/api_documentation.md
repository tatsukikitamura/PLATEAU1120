# PLATEAU-1120 API Documentation

## 概要

このドキュメントは、PLATEAU-1120プロジェクトで提供されているAPIの詳細をまとめたものです。本システムは、千葉市の地理空間データ（PLATEAUデータ）を管理し、AIを活用した地理空間情報分析とチャットボット機能を提供します。

## 目次

1. [API概要](#api概要)
2. [エンドポイント一覧](#エンドポイント一覧)
3. [認証](#認証)
4. [レスポンス形式](#レスポンス形式)
5. [エンドポイント詳細](#エンドポイント詳細)
6. [データモデル](#データモデル)
7. [サービス層](#サービス層)
8. [エラーハンドリング](#エラーハンドリング)

---

## API概要

### 基本情報

- **ベースURL**: `/api`
- **認証方式**: 環境変数によるAPIキー管理
- **レスポンス形式**: JSON
- **文字コード**: UTF-8

### 主要機能

1. **GeoJSONデータ管理**: PLATEAUデータの取得・フィルタリング
2. **フィルタ条件管理**: データ表示用のフィルタ条件のCRUD操作
3. **Google Maps連携**: 施設検索、経路検索、住所検索
4. **チャットボット**: AIによる地理空間情報の質問応答

---

## エンドポイント一覧

### GeoJSON データ管理

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/api/geo_json_data` | データ一覧取得 |
| GET | `/api/geo_json_data/:id` | 詳細データ取得 |
| POST | `/api/geo_json_data/:id/apply_filter` | フィルタ適用 |
| GET | `/api/geo_json_data/statistics` | 統計情報取得 |

### フィルタ条件管理

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/api/filter_conditions` | フィルタ条件一覧取得 |
| POST | `/api/filter_conditions` | フィルタ条件作成 |
| PATCH/PUT | `/api/filter_conditions/:id` | フィルタ条件更新 |
| DELETE | `/api/filter_conditions/:id` | フィルタ条件削除 |
| POST | `/api/filter_conditions/:id/toggle` | フィルタ条件の有効/無効切り替え |
| POST | `/api/filter_conditions/reset_defaults` | デフォルトフィルタリセット |

### Google Maps API連携

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/api/google_maps/search_places` | 施設検索 |
| POST | `/api/google_maps/directions` | 経路検索 |
| POST | `/api/google_maps/geocode` | 住所→座標変換 |

### チャットボットAPI

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/api/chatbot/select_data` | データ選択（1段階目） |
| POST | `/api/chatbot/generate_response` | 応答生成（2段階目） |

---

## 認証

### APIキー管理

システムは以下のAPIキーを使用します：

- **DEEPSEEK_API_KEY**: DeepSeek AI用
- **GOOGLE_MAPS_API_KEY**: Google Maps API用

### 実装方法

APIキーの検証は`ApiKeyValidator`モジュールを通じて行われます：

```ruby
# app/controllers/concerns/api_key_validator.rb
module ApiKeyValidator
  def validate_api_keys
    required_api_keys.each do |key_name|
      unless ENV[key_name].present?
        render json: { success: false, error: "#{key_name}が設定されていません" }
        return false
      end
    end
    true
  end
end
```

### 必要なAPIキー

| コントローラー | 必要なAPIキー |
|--------------|--------------|
| `ChatbotController` | DEEPSEEK_API_KEY |
| `GoogleMapsController` | GOOGLE_MAPS_API_KEY |

---

## レスポンス形式

### 成功レスポンス

```json
{
  "success": true,
  "data": {},
  "message": "メッセージ（オプション）",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### エラーレスポンス

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "errors": ["詳細なエラー（オプション）"],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### HTTPステータスコード

| コード | 意味 |
|-------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | リクエスト不正 |
| 401 | 認証エラー |
| 404 | リソース未検出 |
| 422 | バリデーションエラー |
| 500 | サーバーエラー |
| 503 | サービス利用不可 |

---

## エンドポイント詳細

### 1. GeoJSON データ管理

#### 1.1 GET `/api/geo_json_data`

データ一覧を取得します。

**パラメータ**:

| パラメータ | 型 | 説明 | 必須 |
|-----------|----|----|------|
| `data_type` | String | データ型（Point, MultiLineString等） | 否 |
| `search` | String | 検索キーワード | 否 |

**レスポンス例**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "公園データ",
      "data_type": "Point",
      "file_path": "data/geoJSON/Point/parks.geojson",
      "visible": true,
      "display_order": 0,
      "schema_summary": "{\"properties\": {...}}"
    }
  ],
  "meta": {
    "total": 11,
    "data_types": ["Point", "MultiLineString"]
  }
}
```

#### 1.2 GET `/api/geo_json_data/:id`

特定のデータの詳細を取得します。

**レスポンス例**:

```json
{
  "success": true,
  "data": {
    "geo_json_data": {...},
    "geojson_content": {
      "type": "FeatureCollection",
      "features": [...]
    },
    "statistics": {
      "total_features": 100,
      "geometry_types": ["Point"],
      "property_keys": ["parkName", "parkType"],
      "bounds": {
        "min_lng": 140.0,
        "max_lng": 141.0,
        "min_lat": 35.0,
        "max_lat": 36.0
      }
    }
  }
}
```

#### 1.3 POST `/api/geo_json_data/:id/apply_filter`

フィルタ条件を適用してデータを取得します。

**パラメータ**:

```json
{
  "filter_condition_ids": [1, 2, 3]
}
```

**レスポンス例**:

```json
{
  "success": true,
  "data": {
    "original_data": {...},
    "filtered_data": {...},
    "applied_filters": [...],
    "statistics": {
      "original_count": 100,
      "filtered_count": 50
    }
  }
}
```

#### 1.4 GET `/api/geo_json_data/statistics`

統計情報を取得します。

**レスポンス例**:

```json
{
  "overall": {
    "total": 11,
    "by_type": {
      "Point": 8,
      "MultiLineString": 3
    },
    "visible": 11,
    "hidden": 0
  },
  "by_data_type": {
    "Point": {
      "total": 8,
      "visible": 8,
      "hidden": 0
    }
  }
}
```

### 2. フィルタ条件管理

#### 2.1 GET `/api/filter_conditions`

フィルタ条件一覧を取得します。

**パラメータ**:

| パラメータ | 型 | 説明 | 必須 |
|-----------|----|----|------|
| `data_type` | String | データ型でフィルタ | 否 |

**レスポンス例**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "ランドマークのみ",
      "data_type": "Point",
      "conditions": "{\"type_equals\": \"landmark\"}",
      "active": true,
      "priority": 1
    }
  ],
  "meta": {
    "total": 4,
    "data_types": ["Point"]
  }
}
```

#### 2.2 POST `/api/filter_conditions`

新しいフィルタ条件を作成します。

**リクエストボディ**:

```json
{
  "filter_condition": {
    "name": "新規フィルタ",
    "data_type": "Point",
    "active": true,
    "priority": 5,
    "conditions": {
      "name_contains": "公園"
    }
  }
}
```

#### 2.3 PATCH/PUT `/api/filter_conditions/:id`

フィルタ条件を更新します。

#### 2.4 DELETE `/api/filter_conditions/:id`

フィルタ条件を削除します。

#### 2.5 POST `/api/filter_conditions/:id/toggle`

フィルタ条件の有効/無効を切り替えます。

#### 2.6 POST `/api/filter_conditions/reset_defaults`

デフォルトフィルタをリセットします。

### 3. Google Maps API連携

#### 3.1 POST `/api/google_maps/search_places`

施設を検索します。

**リクエストボディ**:

```json
{
  "query": "カフェ 千葉駅",
  "location": {
    "lat": 35.6131,
    "lng": 140.1028
  },
  "radius": 5000,
  "type": "cafe"
}
```

**レスポンス例**:

```json
{
  "success": true,
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [140.1028, 35.6131]
        },
        "properties": {
          "name": "カフェ名",
          "place_id": "...",
          "rating": 4.5,
          "vicinity": "千葉市..."
        }
      }
    ]
  },
  "metadata": {
    "query": "カフェ 千葉駅",
    "location": {...},
    "radius": 5000,
    "type": "cafe",
    "feature_count": 10
  }
}
```

#### 3.2 POST `/api/google_maps/directions`

経路を検索します。

**リクエストボディ**:

```json
{
  "origin": "千葉駅",
  "destination": "幕張メッセ",
  "mode": "driving",
  "alternatives": true
}
```

**レスポンス例**:

```json
{
  "success": true,
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": [[140.1, 35.6], [140.2, 35.7]]
        },
        "properties": {
          "route_index": 0,
          "summary": "経路概要",
          "legs": [...]
        }
      }
    ]
  },
  "metadata": {
    "origin": "千葉駅",
    "destination": "幕張メッセ",
    "mode": "driving",
    "alternatives": true,
    "route_count": 1
  }
}
```

#### 3.3 POST `/api/google_maps/geocode`

住所を座標に変換します。

**リクエストボディ**:

```json
{
  "address": "千葉県千葉市中央区"
}
```

**レスポンス例**:

```json
{
  "success": true,
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [140.1234, 35.5678]
        },
        "properties": {
          "formatted_address": "千葉県千葉市中央区...",
          "place_id": "...",
          "types": ["locality", "political"]
        }
      }
    ]
  },
  "metadata": {
    "address": "千葉県千葉市中央区",
    "result_count": 1
  }
}
```

### 4. チャットボットAPI

#### 4.1 POST `/api/chatbot/select_data` (1段階目)

ユーザーの質問から関連データを選択します。

**リクエストボディ**:

```json
{
  "user_query": "公園はどこにありますか？"
}
```

**レスポンス例**:

```json
{
  "success": true,
  "selected_data": [
    {
      "name": "parks",
      "data_type": "Point",
      "schema_summary": "{\"properties\": {...}}"
    }
  ],
  "should_display_on_map": true,
  "should_use_google_maps": false,
  "google_maps_query": null
}
```

#### 4.2 POST `/api/chatbot/generate_response` (2段階目)

選択されたデータに基づいてAI応答を生成します。

**リクエストボディ**:

```json
{
  "messages": [
    {"role": "user", "content": "公園はどこにありますか？"}
  ],
  "selected_data": [
    {
      "name": "parks",
      "data_type": "Point"
    }
  ]
}
```

**レスポンス例**:

```json
{
  "success": true,
  "response": "千葉市には以下の公園があります：..."
}
```

---

## データモデル

### GeoJsonData

地理空間データを管理するモデル。

**属性**:

| 属性 | 型 | 説明 |
|-----|----|----|
| `id` | Integer | 主キー |
| `name` | String | データ名 |
| `data_type` | String | データ型（Point, MultiLineString, 3DTiles, OSM） |
| `file_path` | String | GeoJSONファイルのパス |
| `visible` | Boolean | 表示フラグ |
| `display_order` | Integer | 表示順序 |
| `schema_summary` | Text | スキーマ情報（JSON） |
| `properties_json` | Text | プロパティ情報（JSON） |
| `metadata` | Text | メタデータ（JSON） |

**主要メソッド**:

- `properties`: プロパティをHash形式で取得
- `metadata`: メタデータをHash形式で取得
- `schema_summary_hash`: スキーマ概要をHash形式で取得
- `extract_schema_summary`: スキーマ概要を抽出
- `file_exists?`: ファイルの存在確認
- `file_size`: ファイルサイズ取得
- `data_type_display_name`: データ型の表示名
- `stats`: 統計情報取得

### FilterCondition

フィルタ条件を管理するモデル。

**属性**:

| 属性 | 型 | 説明 |
|-----|----|----|
| `id` | Integer | 主キー |
| `name` | String | フィルタ名 |
| `data_type` | String | 適用データ型 |
| `conditions` | Text | フィルタ条件（JSON） |
| `active` | Boolean | 有効フラグ |
| `priority` | Integer | 優先度 |

**主要メソッド**:

- `conditions_hash`: 条件をHash形式で取得
- `apply_to_geojson(geojson_data)`: GeoJSONデータにフィルタ適用
- `description`: 条件の説明文を生成
- `create_default_filters`: デフォルトフィルタを作成

---

## サービス層

### DeepSeek API連携

#### Deepseek::ChatService

AIチャット機能を提供します。

**主要メソッド**:

- `chat(messages, system_prompt: nil)`: チャットメッセージ送信
- `chat_with_selected_data(messages, selected_data)`: 選択データを使用した応答生成

#### Deepseek::DataSelectorService

関連データを選択します。

**主要メソッド**:

- `select_relevant_data(user_message)`: ユーザーメッセージから関連データを選択

#### Deepseek::DeterminerService

Google Maps APIの使用可否を判定します。

**主要メソッド**:

- `should_use_google_maps?(user_query)`: Google Maps APIが必要か判定

### Google Maps API連携

#### GoogleMaps::GeoJsonService

Google Maps APIを呼び出し、GeoJSON形式で返却します。

**主要メソッド**:

- `search_places(query, location:, radius:, type:)`: 施設検索
- `get_directions(origin, destination, mode:, alternatives:)`: 経路検索
- `geocode(address)`: 住所→座標変換
- `places_to_geojson(places_response)`: Places APIレスポンスをGeoJSONに変換
- `directions_to_geojson(directions_response)`: Directions APIレスポンスをGeoJSONに変換
- `geocoding_to_geojson(geocoding_response)`: Geocoding APIレスポンスをGeoJSONに変換

#### GoogleMaps::QueryGeneratorService

ユーザークエリからGoogle Maps用のクエリを生成します。

**主要メソッド**:

- `generate_query(user_query)`: Google Maps API用のクエリを生成

### 共通サービス

#### Common::MapDisplayDeterminer

マップ表示の必要有無を判定します。

**主要メソッド**:

- `should_display_on_map?(user_query)`: マップに表示すべきか判定

#### GeoJsonProcessor

GeoJSONデータの処理を行います。

**主要メソッド**:

- `load_geojson_data(file_path)`: GeoJSONデータの読み込み
- `apply_filters(geojson_data, filter_conditions)`: フィルタ適用
- `validate_schema(geojson_data)`: スキーマ検証
- `get_statistics(geojson_data)`: 統計情報取得
- `calculate_bounds(features)`: バウンディングボックス計算

---

## エラーハンドリング

### ApiResponseHelper

共通のレスポンスヘルパーを提供します。

**主要メソッド**:

- `render_success(data, message: nil, status: :ok)`: 成功レスポンス
- `render_error(message, status: :bad_request, errors: nil)`: エラーレスポンス
- `validate_presence(param_value, error_message)`: パラメータ検証
- `render_not_found(message)`: 404エラー
- `handle_standard_error(e)`: 標準エラーハンドリング

### エラーログ

開発環境では、以下の情報がログに記録されます：

- APIリクエスト情報（URL、パラメータ）
- APIレスポンス情報（ステータスコード、ボディ）
- エラーの詳細（メッセージ、バックトレース）

---

## 実装の特徴

### 1. モジュール化

- `ApiResponseHelper`: レスポンス形式の統一
- `ApiKeyValidator`: APIキー検証
- `DeepseekApiClient`: DeepSeek API通信
- `GoogleMapsApiClient`: Google Maps API通信

### 2. 2段階チャットボット

- **1段階目**: データ選択（`select_data`）
  - ユーザークエリから関連データを選択
  - マップ表示/Google Maps使用の判定
  
- **2段階目**: 応答生成（`generate_response`）
  - 選択されたデータに基づいてAI応答を生成

### 3. GeoJSON標準準拠

Google Maps APIのレスポンスは、GeoJSON形式に変換されて返却されます。

### 4. フィルタリング機能

条件を複数組み合わせて、柔軟にデータをフィルタリングできます。

---

## ファイル構造

```
app/
├── controllers/
│   ├── api/
│   │   ├── chatbot_controller.rb
│   │   ├── filter_conditions_controller.rb
│   │   ├── geo_json_data_controller.rb
│   │   └── google_maps_controller.rb
│   └── concerns/
│       ├── api_key_validator.rb
│       └── api_response_helper.rb
├── models/
│   ├── filter_condition.rb
│   └── geo_json_data.rb
└── services/
    ├── common/
    │   └── map_display_determiner.rb
    ├── concerns/
    │   ├── deepseek_api_client.rb
    │   └── google_maps_api_client.rb
    ├── deepseek/
    │   ├── chat_service.rb
    │   ├── data_selector_service.rb
    │   └── determiner_service.rb
    ├── google_maps/
    │   ├── geo_json_service.rb
    │   └── query_generator_service.rb
    └── geo_json_processor.rb
```

---

## まとめ

本システムは、以下の機能を提供します：

1. **地理空間データ管理**: PLATEAUデータの効率的な管理と取得
2. **AI連携**: DeepSeekを使用したインテリジェントなデータ選択と応答生成
3. **外部API統合**: Google Maps APIとの連携による拡張機能
4. **柔軟なフィルタリング**: 多様な条件でのデータフィルタリング

これらの機能により、千葉市の地理空間データを効率的に分析し、ユーザーフレンドリーな形で提供します。

