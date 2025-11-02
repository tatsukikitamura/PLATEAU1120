# LangChain Geo Service

LangChainを使った地理空間データAIサービス（FastAPI実装）

## 概要

このサービスは、Railsアプリケーション（PLATEAU-1120）のAIサービスをLangChainベースのFastAPIサービスとして外部化したものです。OpenAI APIを使用してチャットボット、データ選択、判定機能を提供します。

## 機能

- **チャット機能**: LangChainを使ったチャットボット機能（メモリー管理対応）
- **データ選択機能**: ユーザーの質問から関連するGeoJSONデータを選択
- **判定機能**: Google Maps API使用判定、マップ表示判定

## セットアップ

### 1. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env`を作成：

```bash
cp .env.example .env
```

`.env`ファイルを編集：

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000
```

### 3. アプリケーションの起動

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

またはDockerを使用：

```bash
docker build -t langchain-geo-service .
docker run -p 8000:8000 --env-file .env langchain-geo-service
```

## APIエンドポイント

### チャット

- `POST /api/chat/`: チャットメッセージを送信
- `DELETE /api/chat/session/{session_id}`: セッションのメモリーをクリア

### データ選択

- `POST /api/data-selector/`: ユーザーの質問から関連データを選択

### 判定

- `POST /api/determiner/google-maps`: Google Maps APIを使うべきかを判定
- `POST /api/determiner/map-display`: マップに表示すべきかを判定

## プロジェクト構造

```
fastapi/
├── app/
│   ├── main.py              # FastAPIアプリケーション
│   ├── config.py            # 設定管理
│   ├── models/
│   │   └── schemas.py       # Pydanticモデル
│   ├── services/
│   │   ├── llm_service.py  # LLMサービス
│   │   └── memory_service.py # メモリー管理
│   ├── chains/
│   │   ├── chat_chain.py    # チャットチェーン
│   │   ├── data_selection_chain.py # データ選択チェーン
│   │   └── determiner_chain.py # 判定チェーン
│   └── routers/
│       ├── chat.py          # チャットルーター
│       ├── data_selector.py  # データ選択ルーター
│       └── determiner.py    # 判定ルーター
├── requirements.txt
├── Dockerfile
└── README.md
```

## Railsアプリからの使用

### Rubyクライアントの例

Rails側で以下のようなクライアントを作成：

```ruby
# app/services/langchain_client.rb
require 'httparty'

module LangchainClient
  BASE_URL = ENV.fetch("LANGCHAIN_SERVICE_URL", "http://localhost:8000")
  
  def self.chat(messages:, session_id: nil, selected_data: nil, system_prompt: nil)
    response = HTTParty.post(
      "#{BASE_URL}/api/chat",
      body: {
        messages: messages.map { |m| { role: m[:role], content: m[:content] } },
        session_id: session_id,
        selected_data: selected_data&.map { |d| { name: d.name, data_type: d.data_type, schema_summary: d.schema_summary } },
        system_prompt: system_prompt
      }.to_json,
      headers: { "Content-Type" => "application/json" }
    )
    response.parsed_response["response"]
  rescue => e
    Rails.logger.error "LangChain API error: #{e.message}"
    nil
  end
  
  def self.select_data(user_query:, available_data:)
    response = HTTParty.post(
      "#{BASE_URL}/api/data-selector",
      body: {
        user_query: user_query,
        available_data: available_data.map { |d| { name: d.name, data_type: d.data_type, schema_summary: d.schema_summary } }
      }.to_json,
      headers: { "Content-Type" => "application/json" }
    )
    response.parsed_response["selected_data"] || []
  rescue => e
    Rails.logger.error "Data selection error: #{e.message}"
    []
  end
  
  def self.should_use_google_maps?(user_query)
    response = HTTParty.post(
      "#{BASE_URL}/api/determiner/google-maps",
      body: { user_query: user_query }.to_json,
      headers: { "Content-Type" => "application/json" }
    )
    response.parsed_response["result"] || false
  rescue => e
    Rails.logger.error "Determination error: #{e.message}"
    false
  end
  
  def self.should_display_on_map?(user_query)
    response = HTTParty.post(
      "#{BASE_URL}/api/determiner/map-display",
      body: { user_query: user_query }.to_json,
      headers: { "Content-Type" => "application/json" }
    )
    response.parsed_response["result"] || false
  rescue => e
    Rails.logger.error "Determination error: #{e.message}"
    false
  end
end
```

### 使用例

```ruby
# チャット機能
messages = [
  { role: "user", content: "千葉市にはどんな公園がありますか？" }
]
response = LangchainClient.chat(messages: messages, session_id: "user_123")
puts response

# データ選択
available_data = GeoJsonData.visible.map do |data|
  { name: data.name, data_type: data.data_type, schema_summary: data.schema_summary_hash }
end
selected = LangchainClient.select_data(
  user_query: "公園のデータを探しています",
  available_data: available_data
)

# 判定
should_use = LangchainClient.should_use_google_maps?("近くのレストランを探しています")
should_display = LangchainClient.should_display_on_map?("公園の場所を教えて")
```

## 開発

開発時は`--reload`フラグを使用：

```bash
uvicorn app.main:app --reload
```

これにより、コード変更時に自動でリロードされます。

## ライセンス

PLATEAU-1120プロジェクトの一部として提供されます。

