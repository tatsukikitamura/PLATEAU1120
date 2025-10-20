# PLATEAU Viewer

PLATEAU データと地理空間情報を 3D 可視化する Rails + CesiumJS アプリケーション。

## 概要

このアプリケーションは、国土交通省が提供する PLATEAU（3D 都市モデル）データや各種 GeoJSON データを CesiumJS 上で可視化・操作するための Web アプリケーションです。

### 主な機能

- 🌍 CesiumJS による 3D 地球儀の表示
- 🏢 PLATEAU 3D Tiles データの読み込みと表示
- 📍 GeoJSON ポイント・ライン・ポリゴンデータの表示
- 🔍 データフィルタリング機能
- 🏗️ OSM Buildings の自動読み込み
- 🎨 カスタムスタイリング

## 技術スタック

- **Backend**: Ruby on Rails 8.0.3
- **Frontend**:
  - CesiumJS 1.134
  - Hotwire (Turbo + Stimulus)
  - Importmap for asset management
- **Database**: SQLite3
- **Web Server**: Puma

## 必要な環境

- Ruby 3.x 以上
- Node.js (Importmap 利用のため最小限の npm コマンド用)
- SQLite3

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/tatsukikitamura/PLATEAU1120.git
cd PLATEAU1120
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

Cesium Ion トークンの取得方法：

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
詳細は [public/data/README.md](public/data/README.md) を参照してください。

```
public/data/
├── geoJSON/
│   ├── Point/
│   │   ├── landmark.geojson
│   │   ├── park.geojson
│   │   ├── shelter.geojson
│   │   └── station.geojson
│   └── MultiLineString/
│       ├── border.geojson
│       ├── emergency_route.geojson
│       └── railway.geojson
└── tileset/
    └── bldg/
        └── bldg_3dtiles_lod1/
            └── tileset.json
```

### 6. アプリケーションの起動

```bash
bin/rails server
```

ブラウザで http://localhost:3000 にアクセスしてください。

## 使い方

### 基本操作

- **Point**: ポイントデータ（ランドマーク、公園、避難所、駅）を表示
- **Line**: 3D Tiles データを読み込み
- **Multi Line**: マルチラインストリングデータ（境界線、鉄道、緊急輸送道路）を表示

### データフィルタリング

画面右上のフィルタパネルから：

1. 表示したいデータを選択（ボタンクリック）
2. フィルタ条件を入力
3. 「フィルタ適用」ボタンをクリック

### カメラ操作

- **左ドラッグ**: 視点回転
- **右ドラッグ**: パン（移動）
- **マウスホイール**: ズームイン/アウト
- **中ドラッグ**: カメラの傾き変更

## 開発

### ディレクトリ構成

```
.
├── app/
│   ├── assets/
│   │   └── stylesheets/      # CSS
│   ├── controllers/           # Railsコントローラ
│   ├── javascript/            # フロントエンドJavaScript
│   │   ├── application.js     # メインエントリポイント
│   │   ├── 3dtile.js          # 3D Tiles読み込み
│   │   ├── geojsonLoader.js   # GeoJSON読み込み
│   │   ├── controller.js      # UIコントローラ
│   │   ├── geojson.js         # フィルタリング機能
│   │   ├── schema.js          # スキーマ処理
│   │   └── dataManager.js     # データ管理
│   └── views/
│       ├── layouts/
│       │   └── application.html.erb
│       └── main/
│           └── index.html.erb
├── config/
│   ├── importmap.rb           # Importmap設定
│   └── routes.rb              # ルーティング
└── public/
    └── data/                  # 地理空間データ（gitignore対象）
```

### 新しいデータソースの追加

1. `app/javascript/geojsonLoader.js` の `geourls` 配列に URL を追加
2. または `app/javascript/3dtile.js` の `urls` 配列に 3D Tiles URL を追加
3. 必要に応じて `controller.js` にボタンとイベントハンドラを追加

### スタイリングのカスタマイズ

- CSS: `app/assets/stylesheets/application.css`
- 3D Tiles スタイル: `app/javascript/3dtile.js` の `Cesium3DTileStyle`
- GeoJSON スタイル: `app/javascript/geojsonLoader.js` の `load` オプション

## トラブルシューティング

### Cesium が表示されない

1. ブラウザのコンソールでエラーを確認
2. `.env` ファイルに正しいトークンが設定されているか確認
3. `public/data/` にデータファイルが配置されているか確認

### データが読み込まれない

- ブラウザの開発者ツールの Network タブで 404 エラーを確認
- ファイルパスが `public/data/` 配下と一致しているか確認
- GeoJSON の形式が正しいか [GeoJSONLint](https://geojsonlint.com/) で検証

### スタイルが適用されない

- ブラウザのキャッシュをクリア（Cmd+Shift+R または Ctrl+Shift+R）
- `bin/rails assets:clobber` でアセットをクリーンビルド

## デプロイ

### Docker を使用する場合

```bash
docker build -t plateau-viewer .
docker run -p 3000:3000 -e CESIUM_ION_ACCESS_TOKEN=your_token plateau-viewer
```

### Kamal を使用する場合

```bash
kamal setup
kamal deploy
```

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 貢献

プルリクエストを歓迎します！バグ報告や機能要望は Issue で受け付けています。

## 参考資料

- [PLATEAU 公式サイト](https://www.mlit.go.jp/plateau/)
- [CesiumJS ドキュメント](https://cesium.com/docs/)
- [Rails Guides](https://guides.rubyonrails.org/)
- [Hotwire](https://hotwired.dev/)

## お問い合わせ

質問や提案は [Issues](https://github.com/tatsukikitamura/PLATEAU1120/issues) でお願いします。
