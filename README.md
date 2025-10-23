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
- 📍 **GeoJSON データ表示**: ポイント・ライン・ポリゴンデータの表示
  - ランドマーク、公園、避難所、駅などのポイントデータ
  - 境界線、鉄道、緊急輸送道路などのラインストリングデータ
- 🔍 **高度なフィルタリング機能**: スキーマベースの動的フィルタリング
- 🏗️ **OSM Buildings**: OpenStreetMap 建物データの自動読み込み
- 🎨 **カスタムスタイリング**: データタイプ別の視覚的表現

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

`.env` ファイルを編集して Cesium Ion アクセストークンを設定：

```env
CESIUM_ION_ACCESS_TOKEN=your_actual_token_here
```

**Cesium Ion トークンの取得方法：**

1. [Cesium Ion](https://ion.cesium.com/) にアカウント登録
2. [Access Tokens](https://ion.cesium.com/tokens) ページでトークンを生成
3. 生成されたトークンを `.env` に設定

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

## 開発

### ディレクトリ構成

```
.
├── app/
│   ├── assets/
│   │   └── stylesheets/      # CSS
│   ├── controllers/           # Railsコントローラ
│   │   ├── application_controller.rb
│   │   └── main_controller.rb # メインコントローラ
│   ├── javascript/            # フロントエンドJavaScript
│   │   ├── application.js     # メインエントリポイント
│   │   ├── leaflet_application.js # Leaflet用エントリポイント
│   │   └── plateau/           # PLATEAU関連モジュール
│   │       ├── cesium/        # CesiumJS関連
│   │       │   ├── geojson_loader.js
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
│   └── views/
│       ├── layouts/
│       │   └── application.html.erb
│       └── main/              # メインビュー
│           ├── home.html.erb  # ホームページ（3D/2D選択）
│           ├── cesium.html.erb # 3Dビュー
│           ├── map2d.html.erb # 2Dマップ
│           └── index.html.erb  # レガシーページ
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

## 参考資料

- [PLATEAU 公式サイト](https://www.mlit.go.jp/plateau/)
- [CesiumJS ドキュメント](https://cesium.com/docs/)
- [Leaflet ドキュメント](https://leafletjs.com/)
- [Rails Guides](https://guides.rubyonrails.org/)
- [Hotwire](https://hotwired.dev/)
- [地理院タイル](https://maps.gsi.go.jp/development/ichiran.html)

## お問い合わせ

質問や提案は [Issues](https://github.com/tatsukikitamura/PLATEAU-1120/issues) でお願いします。
