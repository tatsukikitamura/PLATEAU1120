# PLATEAU-1120

PLATEAU データと地理空間情報を 3D/2D で可視化する Rails アプリケーション。

## 概要

このアプリケーションは、国土交通省が提供する PLATEAU（3D 都市モデル）データや各種 GeoJSON データを、CesiumJS（3D）と Leaflet（2D）の両方で可視化・操作するための Web アプリケーションです。

### 主な機能

- 🌐 **3D ビュー**: CesiumJS による高度な 3D 地理空間ビューアー
  - PLATEAU 3D Tiles データの読み込みと表示
  - 建物モデルの表示（LOD1/LOD2対応）
  - 地形に沿った表示
- 🗺️ **2D マップ**: Leaflet による軽量で高速な 2D 地図ビューアー
  - 高速な動作
  - シンプルなUI
  - モバイル対応
- 🤖 **AIチャットボット**: DeepSeek API による地理空間データ分析
  - 自然言語での質問応答
  - 関連データの自動選択と表示
  - Google Maps API 連携
- 📍 **GeoJSON データ表示**: ポイント・ライン・ポリゴンデータの表示
  - ランドマーク、公園、避難所、駅などのポイントデータ
  - 境界線、鉄道、緊急輸送道路などのラインストリングデータ
- 🔍 **高度なフィルタリング機能**: スキーマベースの動的フィルタリング
- 🏗️ **OSM Buildings**: OpenStreetMap 建物データの自動読み込み
- 🎨 **カスタムスタイリング**: データタイプ別の視覚的表現
- 🗺️ **Google Maps 連携**: Places API、Directions API、Geocoding API との統合

## 技術スタック

- **Backend**: Ruby on Rails 8.0.3
- **Frontend**:
  - **3D ビュー**: CesiumJS 1.134
  - **2D マップ**: Leaflet 1.9.4
  - Hotwire (Turbo + Stimulus)
  - Importmap for asset management
- **Database**: SQLite3
- **Web Server**: Puma
- **Deployment**: Kamal + Docker
- **Development Tools**:
  - Brakeman (セキュリティ分析)
  - RuboCop (コード品質)
  - Thruster (HTTP アセット最適化)

## 必要な環境

- Ruby 3.x 以上
- Node.js (Importmap 利用のため最小限の npm コマンド用)
- SQLite3
- Docker (オプション、デプロイ用)

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/tatsukikitamura/PLATEAU-1120.git
cd PLATEAU-1120
```

### 2. 依存関係のインストール

```bash
bundle install
```

### 3. 環境変数の設定

`.env.example` をコピーして `.env` ファイルを作成：

```bash
cp .env.example .env
```

`.env` ファイルを編集して必要なトークンを設定：

```env
# Cesium Ion トークン
CESIUM_ION_ACCESS_TOKEN=your_cesium_token_here

# DeepSeek API トークン（AIチャットボット機能用）
DEEPSEEK_API_KEY=your_deepseek_token_here

# Google Maps API キー（任意、Google Maps連携機能用）
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

**各トークンの取得方法：**

**Cesium Ion トークン：**
1. [Cesium Ion](https://ion.cesium.com/) にアカウント登録
2. [Access Tokens](https://ion.cesium.com/tokens) ページでトークンを生成
3. 生成されたトークンを `.env` に設定

**DeepSeek API トークン：**
1. [DeepSeek API](https://platform.deepseek.com/) にアカウント登録
2. API Keys ページでトークンを生成
3. 生成されたトークンを `.env` に設定

**Google Maps API キー（任意）：**
1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. Maps JavaScript API、Places API、Directions API、Geocoding API を有効化
3. API キーを生成して `.env` に設定

### 4. データベースのセットアップ

```bash
bin/rails db:create
bin/rails db:migrate
```

### 5. データの配置

PLATEAU データや GeoJSON ファイルを `public/data/` 配下に配置してください。

```
public/data/
├── geoJSON/
│   ├── Point/
│   │   ├── landmark.geojson
│   │   ├── park.geojson
│   │   ├── shelter.geojson
│   │   ├── station.geojson
│   │   └── schema/
│   │       ├── landmark.schema.geojson
│   │       ├── park.schema.geojson
│   │       ├── shelter.schema.geojson
│   │       └── station.schema.geojson
│   └── MultiLineString/
│       ├── border.geojson
│       ├── emergency_route.geojson
│       └── railway.geojson
├── meta/
│   ├── luse/
│   │   └── luse_mvt/
│   └── tran/
│       └── tran_mvt_lod1/
└── tileset/
    ├── building_lod1/
    ├── building_lod2/
    ├── building_lod2_no_texture/
    └── bridge_lod2/
```

### 6. アプリケーションの起動

```bash
bin/rails server
```

ブラウザで http://localhost:3000 にアクセスしてください。

## 使い方

### アプリケーションの起動

ブラウザで http://localhost:3000 にアクセスすると、ホームページが表示されます。

### ビューモードの選択

ホームページから以下のいずれかを選択：

- **🌐 3D ビュー**: CesiumJS による高度な 3D 地理空間ビューアー
- **🗺️ 2D マップ**: Leaflet による軽量で高速な 2D 地図ビューアー
- **🤖 AI チャットボット**: DeepSeek API による自然言語インターフェース
- **🗺️🤖 チャットボット&マップ**: AIチャットボットと3Dマップの統合ページ
- **📊 観光ルート最適化AI**: 観光地のルート提案機能
- **ℹ️ プロジェクト概要**: プロジェクトの詳細情報と統計データ

### 3D ビューでの操作

#### データ表示ボタン

- **Point**: ポイントデータ（ランドマーク、公園、避難所、駅）を表示
- **Line**: 3D Tiles データを読み込み
- **OSM Buildings**: OpenStreetMap 建物データを表示
- **Multi Line**: マルチラインストリングデータ（境界線、鉄道、緊急輸送道路）を表示
- **全てのデータ**: すべてのデータを一度に表示

#### Point データの詳細選択

Point ボタンをクリックすると、以下の選択肢が表示されます：

- **ランドマーク**: 重要な建物や場所
- **公園**: 公園や緑地
- **避難所**: 災害時の避難場所
- **駅**: 鉄道駅
- **すべてのPoint**: すべてのポイントデータ

#### データフィルタリング

画面左上のフィルタパネルから：

1. 表示したいデータを選択（ボタンクリック）
2. スキーマから動的に生成されたフィルタ条件を入力
3. 「フィルタ適用」ボタンをクリック
4. 「クリア」ボタンでフィルタをリセット

#### カメラ操作（3D）

- **左ドラッグ**: 視点回転
- **右ドラッグ**: パン（移動）
- **マウスホイール**: ズームイン/アウト
- **中ドラッグ**: カメラの傾き変更

### 2D マップでの操作

#### データ表示ボタン

- **Point**: ポイントデータを表示
- **Line**: ラインストリングデータを表示
- **Multi Line**: マルチラインストリングデータを表示
- **全てのデータ**: すべてのデータを一度に表示

#### フィルタリング機能

3D ビューと同様のフィルタリング機能が利用可能です。

#### マップ操作（2D）

- **ドラッグ**: マップの移動
- **マウスホイール**: ズームイン/アウト
- **ダブルクリック**: ズームイン

### AI チャットボットの使い方

#### 基本的な使い方

1. 「AI チャットボット」ページを開く
2. 質問を入力して送信
3. AIが関連データを自動選択して回答を生成

#### サンプル質問

- 「千葉市の公園を教えて」
- 「駅が近い避難所はどこ？」
- 「ランドマークの場所をマップで見たい」

#### チャットボット&マップ統合機能

「チャットボット&マップ」ページでは：

1. AIが質問内容を分析
2. 関連する地理空間データを自動選択
3. 「マップに表示」ボタンで3Dマップにデータを表示
4. Google Mapsデータが必要な場合は自動で連携

### データの統計情報

「プロジェクト概要」ページでは：

- 総データセット数
- データタイプ別の統計
- 表示データと非表示データの内訳
- 最終更新日時

## 開発

### ディレクトリ構成

```
.
├── app/
│   ├── assets/
│   │   └── stylesheets/      # CSS
│   ├── controllers/           # Railsコントローラ
│   │   ├── api/              # APIコントローラ
│   │   │   ├── chatbot_controller.rb # AIチャットボットAPI
│   │   │   ├── filter_conditions_controller.rb
│   │   │   ├── geo_json_data_controller.rb
│   │   │   └── google_maps_controller.rb
│   │   ├── application_controller.rb
│   │   └── main_controller.rb # メインコントローラ
│   ├── javascript/            # フロントエンドJavaScript
│   │   ├── application.js     # メインエントリポイント
│   │   ├── cesium_application.js # Cesium用エントリポイント
│   │   ├── chatbot.js         # AIチャットボットUI
│   │   ├── chatbot_map_application.js # チャットボット&マップ統合
│   │   ├── leaflet_application.js # Leaflet用エントリポイント
│   │   ├── markdown_renderer.js # マークダウン表示
│   │   └── plateau/           # PLATEAU関連モジュール
│   │       ├── cesium/        # CesiumJS関連
│   │       │   ├── geojson_loader.js
│   │       │   ├── google_maps_loader.js # Google Maps連携
│   │       │   ├── infobox_customizer.js
│   │       │   ├── osm_buildings.js
│   │       │   └── tiles_loader.js
│   │       ├── leaflet/       # Leaflet関連
│   │       │   ├── geojson_loader.js
│   │       │   └── leaflet_controller.js
│   │       ├── filters/       # フィルタリング機能
│   │       │   ├── data_type_mapping.js
│   │       │   ├── filter_form.js
│   │       │   ├── filter_logic.js
│   │       │   └── schema.js
│   │       ├── ui/            # UI制御
│   │       │   └── controller.js
│   │       └── utils/          # ユーティリティ
│   │           └── data_manager.js
│   ├── models/                # データモデル
│   │   ├── filter_condition.rb # フィルタ条件
│   │   └── geo_json_data.rb   # GeoJSONデータ
│   ├── services/              # ビジネスロジック
│   │   └── api/               # APIサービス
│   │       ├── deepseek_chat_service.rb # DeepSeek API通信
│   │       ├── google_maps_determiner.rb # Google Maps判定
│   │       ├── google_maps_geo_json_service.rb
│   │       ├── google_maps_query_generator.rb
│   │       └── map_display_determiner.rb
│   └── views/
│       ├── layouts/
│       │   └── application.html.erb
│       └── main/              # メインビュー
│           ├── home.html.erb  # ホームページ
│           ├── cesium.html.erb # 3Dビュー
│           ├── map2d.html.erb # 2Dマップ
│           ├── chatbot.html.erb # AIチャットボット
│           ├── chatbot_map.html.erb # チャットボット&マップ統合
│           ├── tourist_route.html.erb # 観光ルート最適化
│           └── info.html.erb  # プロジェクト概要
├── config/
│   ├── importmap.rb           # Importmap設定
│   └── routes.rb              # ルーティング
├── public/
│   └── data/                  # 地理空間データ
│       ├── geoJSON/           # GeoJSONファイル
│       ├── meta/              # メタデータ
│       └── tileset/           # 3D Tilesデータ
└── vendor/
    └── javascript/            # 外部ライブラリ
        ├── cesium.js          # CesiumJS
        └── leaflet関連ファイル
```

### 新しいデータソースの追加

#### GeoJSON データの追加

1. `app/javascript/plateau/cesium/geojson_loader.js` または `app/javascript/plateau/leaflet/geojson_loader.js` の `GEOJSON_URLS` 配列に URL を追加
2. `public/data/geoJSON/` 配下に GeoJSON ファイルを配置
3. 必要に応じて `app/javascript/plateau/filters/data_type_mapping.js` にデータタイプを追加

#### 3D Tiles データの追加

1. `app/javascript/plateau/cesium/tiles_loader.js` の `TILESET_URLS` 配列に URL を追加
2. `public/data/tileset/` 配下に 3D Tiles データを配置

### スタイリングのカスタマイズ

- **CSS**: `app/assets/stylesheets/application.css`
- **3D Tiles スタイル**: `app/javascript/plateau/cesium/tiles_loader.js` の `Cesium3DTileStyle`
- **GeoJSON スタイル**: `app/javascript/plateau/cesium/geojson_loader.js` または `app/javascript/plateau/leaflet/geojson_loader.js` の `load` オプション
- **Leaflet スタイル**: `app/javascript/plateau/leaflet/leaflet_controller.js` のスタイル設定

## トラブルシューティング

### Cesium が表示されない

1. ブラウザのコンソールでエラーを確認
2. `.env` ファイルに正しい Cesium Ion トークンが設定されているか確認
3. `public/data/` にデータファイルが配置されているか確認
4. ネットワーク接続を確認（Cesium Ion へのアクセスが必要）

### Leaflet マップが表示されない

1. ブラウザのコンソールでエラーを確認
2. 地理院タイルサーバーへのアクセスを確認
3. インターネット接続を確認

### データが読み込まれない

- ブラウザの開発者ツールの Network タブで 404 エラーを確認
- ファイルパスが `public/data/` 配下と一致しているか確認
- GeoJSON の形式が正しいか [GeoJSONLint](https://geojsonlint.com/) で検証
- 3D Tiles の `tileset.json` ファイルが正しく配置されているか確認

### フィルタリングが動作しない

- スキーマファイル（`*.schema.geojson`）が正しく配置されているか確認
- ブラウザのコンソールで JavaScript エラーを確認
- フィルタ条件の入力値が正しいか確認

### スタイルが適用されない

- ブラウザのキャッシュをクリア（Cmd+Shift+R または Ctrl+Shift+R）
- `bin/rails assets:clobber` でアセットをクリーンビルド
- JavaScript モジュールの読み込みエラーを確認

### AI チャットボットが動作しない

- `.env` ファイルに `DEEPSEEK_API_KEY` が正しく設定されているか確認
- ブラウザのコンソールでAPIエラーを確認
- ネットワーク接続を確認（DeepSeek API へのアクセスが必要）

## デプロイ

### Docker を使用する場合

```bash
docker build -t plateau-1120 .
docker run -p 3000:3000 -e CESIUM_ION_ACCESS_TOKEN=your_token plateau-1120
```

### Kamal を使用する場合

```bash
kamal setup
kamal deploy
```

### 本番環境での注意事項

- Cesium Ion トークンが正しく設定されていることを確認
- `public/data/` 配下のデータファイルが本番環境に配置されていることを確認
- HTTPS 環境では地理院タイルの CORS 設定に注意

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 貢献

プルリクエストを歓迎します！バグ報告や機能要望は Issue で受け付けています。

## 技術的な詳細

### API エンドポイント

- `POST /api/chatbot/select_data` - ユーザーの質問から関連データを選択
- `POST /api/chatbot/generate_response` - 選択されたデータを使ってAI回答を生成
- `GET /api/geo_json_data` - GeoJSON データの一覧取得
- `GET /api/geo_json_data/:id` - 特定の GeoJSON データの詳細取得
- `POST /api/google_maps/places` - Google Maps Places API 連携
- `POST /api/google_maps/directions` - Google Maps Directions API 連携
- `POST /api/google_maps/geocode` - Google Maps Geocoding API 連携

### 主な技術的特徴

1. **2段階AI処理**: データ選択と回答生成を分離
2. **スキーマベースフィルタリング**: GeoJSON スキーマから動的にフィルタフォームを生成
3. **データ自動選択**: キーワードマッチングとAI判定による関連データの自動選択
4. **Google Maps連携**: PLATEAUデータで対応できないデータをGoogle Mapsで補完
5. **3D/2D統合**: 同じデータを3Dと2Dで表示可能

## 参考資料

- [PLATEAU 公式サイト](https://www.mlit.go.jp/plateau/)
- [CesiumJS ドキュメント](https://cesium.com/docs/)
- [Leaflet ドキュメント](https://leafletjs.com/)
- [DeepSeek API ドキュメント](https://platform.deepseek.com/docs)
- [Google Maps Platform](https://developers.google.com/maps)
- [Rails Guides](https://guides.rubyonrails.org/)
- [Hotwire](https://hotwired.dev/)
- [地理院タイル](https://maps.gsi.go.jp/development/ichiran.html)

## お問い合わせ

質問や提案は [Issues](https://github.com/tatsukikitamura/PLATEAU-1120/issues) でお願いします。
