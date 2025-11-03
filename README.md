# PLATEAU-1120

PLATEAU（3D都市モデル）データと地理空間情報をAIチャットボットと連携して3D/2Dで可視化するWebアプリケーション

## 📋 プロジェクト概要

PLATEAU-1120は、国土交通省が提供するPLATEAU（3D都市モデル）データと各種GeoJSONデータを、AIチャットボット機能と統合して3D/2Dで可視化・操作するためのWebアプリケーションです。千葉市の地理空間データを対象として、自然言語での質問応答とインタラクティブなデータ可視化を実現します。

### 主な機能

- 🌐 **3D可視化**: CesiumJSによる高度な3D地理空間ビューアー
- 🗺️ **2D可視化**: Leafletによる軽量で高速な2D地図ビューアー
- 🤖 **AIチャットボット**: LangChainベースの自然言語インターフェース
- 📍 **GeoJSONデータ管理**: ポイント・ライン・ポリゴンデータの表示とフィルタリング
- 🔍 **高度なフィルタリング**: スキーマベースの動的フィルタリング機能
- 🗺️ **Google Maps連携**: Places API、Directions API、Geocoding APIとの統合
- 🚅 **ODPT連携**: 公共交通データの取得と可視化

## 🏗️ プロジェクト構成

このプロジェクトは、以下の2つの主要なコンポーネントで構成されています：

```
PLATEAU-1120/
├── rails/          # Rails Webアプリケーション（メインアプリ）
└── fastapi/        # FastAPI AIサービス（マイクロサービス）
```

### なぜこの構成なのか？

#### 1. **Rails（メインアプリケーション）**

Railsは以下の役割を担当しています：

- **フロントエンド管理**: HTML/JavaScript/CSSによるUI実装
- **データ管理**: GeoJSONデータの保存・取得・フィルタリング
- **地図可視化**: CesiumJSとLeafletを使った3D/2Dマップ表示
- **API提供**: RESTful APIエンドポイントの提供

**Railsを選択した理由：**
- Webアプリケーションの開発速度が速い
- Active Recordによるデータベース操作が簡単
- Hotwire（Turbo + Stimulus）によるモダンなフロントエンド開発
- 豊富なエコシステムとGemライブラリ

#### 2. **FastAPI（AIサービス）**

FastAPIは以下の役割を担当しています：

- **AI処理**: LangChainを使ったチャットボット機能
- **データ選択**: ユーザーの質問から関連データを自動選択
- **判定機能**: Google Maps API使用判定、マップ表示判定
- **メモリー管理**: セッション管理による会話履歴の保持

**FastAPIを選択した理由：**
- Pythonの豊富なAI/MLライブラリ（LangChain、OpenAI API）を活用できる
- 非同期処理による高速なAPI応答
- OpenAPIによる自動ドキュメント生成
- マイクロサービスアーキテクチャによる責務の分離

#### 3. **分離アーキテクチャのメリット**

この構成により、以下のメリットが得られます：

1. **技術スタックの最適化**
   - Rails: Webアプリケーションに最適
   - FastAPI: AI処理に最適

2. **スケーラビリティ**
   - 各サービスを独立してスケール可能
   - AIサービスの負荷が高い場合でも、Railsアプリに影響を与えない

3. **開発の柔軟性**
   - 各サービスを独立して開発・デプロイ可能
   - 異なるチームが並行して開発できる

4. **保守性の向上**
   - 責務が明確に分離されている
   - バグの影響範囲が限定的

5. **テクノロジーの進化への対応**
   - AI技術の進化に合わせてFastAPI側のみを更新可能
   - LLMモデルの切り替えが容易

## 🚀 技術スタック

### Rails側（メインアプリ）

- **Backend**: Ruby on Rails 8.0.3
- **Frontend**:
  - CesiumJS 1.134（3Dビュー）
  - Leaflet 1.9.4（2Dマップ）
  - Hotwire (Turbo + Stimulus)
  - Importmap for asset management
- **Database**: SQLite3
- **Web Server**: Puma

### FastAPI側（AIサービス）

- **Framework**: FastAPI
- **AI/ML**:
  - LangChain
  - OpenAI API (GPT-3.5-turbo, GPT-4)
- **Async**: httpx（Rails APIとの通信）

## 📁 ディレクトリ構成

### Railsアプリケーション (`rails/`)

```
rails/
├── app/
│   ├── controllers/        # コントローラー（API含む）
│   ├── models/             # データモデル（GeoJsonData、FilterCondition）
│   ├── services/            # ビジネスロジック
│   ├── javascript/         # フロントエンドJavaScript
│   │   ├── plateau/        # PLATEAU関連モジュール
│   │   │   ├── cesium/     # CesiumJS関連
│   │   │   ├── leaflet/    # Leaflet関連
│   │   │   └── filters/    # フィルタリング機能
│   └── views/              # ERBテンプレート
├── public/data/            # 地理空間データ
│   ├── geoJSON/            # GeoJSONファイル
│   ├── meta/               # メタデータ（MVT）
│   └── tileset/            # 3D Tilesデータ
└── config/                 # 設定ファイル
```

### FastAPIアプリケーション (`fastapi/`)

```
fastapi/
├── app/
│   ├── main.py             # FastAPIアプリケーションエントリーポイント
│   ├── config.py           # 設定管理
│   ├── models/
│   │   └── schemas.py      # Pydanticモデル
│   ├── services/
│   │   ├── llm_service.py  # LLMサービス
│   │   ├── memory_service.py # メモリー管理
│   │   └── rails_api_service.py # Rails API通信
│   ├── chains/             # LangChainチェーン
│   │   ├── chat_chain.py   # チャットチェーン
│   │   ├── data_selection_chain.py # データ選択チェーン
│   │   ├── determiner_chain.py # 判定チェーン
│   │   └── query_generator_chain.py # クエリ生成チェーン
│   └── routers/            # APIルーター
│       ├── chat.py         # チャットAPI
│       ├── data_selector.py # データ選択API
│       ├── determiner.py   # 判定API
│       ├── google_maps.py  # Google Maps API
│       └── odpt.py         # ODPT API
└── requirements.txt        # Python依存関係
```

## 🔧 セットアップ

### 前提条件

- Ruby 3.x 以上
- Python 3.11 以上
- Node.js（Importmap利用のため最小限）
- SQLite3

### 1. リポジトリのクローン

```bash
git clone https://github.com/tatsukikitamura/PLATEAU-1120.git
cd PLATEAU-1120
```

### 2. Railsアプリケーションのセットアップ

```bash
cd rails
bundle install
bin/rails db:create db:migrate
```

環境変数の設定（`.env`ファイルを作成）：

```env
CESIUM_ION_ACCESS_TOKEN=your_cesium_token_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
ODPT_API_KEY=your_odpt_key_here
RAILS_API_URL=http://localhost:3000
```

### 3. FastAPIアプリケーションのセットアップ

```bash
cd fastapi
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

環境変数の設定（`.env`ファイルを作成）：

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
ODPT_API_KEY=your_odpt_key_here
RAILS_API_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
API_HOST=0.0.0.0
API_PORT=8000
```

### 4. データの配置

PLATEAUデータやGeoJSONファイルを`rails/public/data/`配下に配置してください。

### 5. アプリケーションの起動

#### Railsアプリケーション

```bash
cd rails
bin/rails server
```

ブラウザで http://localhost:3000 にアクセス

#### FastAPIアプリケーション

```bash
cd fastapi
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

APIドキュメント: http://localhost:8000/docs

## 🔄 サービス間の連携

### Rails → FastAPI の通信

Railsアプリケーションは、以下のような方法でFastAPIサービスを呼び出します：

1. **チャットボット機能**: `/api/chatbot/generate_response`
   - FastAPIの`/api/chat`エンドポイントを呼び出し

2. **データ選択**: `/api/chatbot/select_data`
   - FastAPIの`/api/data-selector`エンドポイントを呼び出し

3. **判定機能**: 各種判定処理
   - FastAPIの`/api/determiner/*`エンドポイントを呼び出し

### FastAPI → Rails の通信

FastAPIサービスは、以下のような方法でRails APIを呼び出します：

1. **データ取得**: GeoJSONデータの一覧取得
   - Railsの`/api/geo_json_data`エンドポイントを呼び出し

2. **統計情報取得**: データの統計情報取得
   - Railsの`/api/geo_json_data/statistics`エンドポイントを呼び出し

## 📝 主要機能の説明

### AIチャットボット機能

ユーザーの自然言語での質問に対して、AIが以下の処理を行います：

1. **質問分析**: ユーザーの質問内容を分析
2. **データ選択**: 関連するGeoJSONデータを自動選択
3. **判定処理**: 
   - Google Maps APIを使用すべきか判定
   - マップに表示すべきか判定
4. **回答生成**: 選択されたデータに基づいて回答を生成
5. **可視化**: 必要に応じて3D/2Dマップにデータを表示

### データ可視化

- **3Dビュー**: CesiumJSによるPLATEAU 3D Tilesデータの表示
- **2Dマップ**: Leafletによる高速な2Dマップ表示
- **フィルタリング**: スキーマベースの動的フィルタリング

## 🧪 開発

### Rails側の開発

```bash
cd rails
bin/rails server  # 開発サーバー起動
bin/rails test    # テスト実行
```

### FastAPI側の開発

```bash
cd fastapi
source venv/bin/activate
uvicorn app.main:app --reload  # 開発サーバー起動（ホットリロード）
```

## 📚 参考資料

- [PLATEAU 公式サイト](https://www.mlit.go.jp/plateau/)
- [CesiumJS ドキュメント](https://cesium.com/docs/)
- [Leaflet ドキュメント](https://leafletjs.com/)
- [LangChain ドキュメント](https://python.langchain.com/)
- [FastAPI ドキュメント](https://fastapi.tiangolo.com/)
- [Rails Guides](https://guides.rubyonrails.org/)

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 🤝 貢献

プルリクエストを歓迎します！バグ報告や機能要望は Issue で受け付けています。

