require_relative "../concerns/deepseek_api_client"

module GoogleMaps
  class QueryGeneratorService
    include DeepseekApiClient

    def initialize(attributes = {})
      super(attributes) if defined?(super)
      validate_api_key
    end

    # ユーザーの質問からGoogle Maps API用のクエリを生成
    def generate_query(user_query)
      return nil if user_query.blank?

      system_prompt = <<~PROMPT
        あなたは千葉市の地理空間データを扱うAIアシスタントです。
        ユーザーの質問から、Google Maps API（Places検索、Geocoding、Directions）に渡す適切な検索クエリを生成してください。

        以下の形式でJSONを返してください：
        {
          "type": "places" または "geocode" または "directions",
          "query": "検索クエリや住所",
          "params": {
            "origin": "出発地（directionsの場合）",
            "destination": "目的地（directionsの場合）"
          }
        }

        判定基準：
        - 施設名やお店の名前を含む場合（例：「カフェ」「レストラン」「コンビニ」「公園」）→ type: "places"
        - 住所や地名を探す場合（例：「千葉駅」「幕張メッセ」）→ type: "geocode"
        - 経路やルートを求める場合（例：「から」「までの道順」「行き方」）→ type: "directions"

        質問文から重要なキーワードだけを抽出してください。説明文は不要です。
        千葉市に関連する質問のみを処理してください。
      PROMPT

      user_prompt = <<~PROMPT
        ユーザーの質問: #{user_query}

        Google Maps APIに渡す適切な検索クエリをJSON形式で返してください。
      PROMPT

      messages = [
        { role: "system", content: system_prompt },
        { role: "user", content: user_prompt }
      ]

      params = {
        model: MODEL,
        messages: messages,
        temperature: 0.3,
        response_format: { type: "json_object" }
      }

      response = make_request("/v1/chat/completions", params)

      if response && response["choices"]&.first
        ai_response = response["choices"].first["message"]["content"].strip

        begin
          query_data = JSON.parse(ai_response)
          Rails.logger.info "AI生成クエリ: #{query_data.inspect}"
          query_data
        rescue JSON::ParserError => e
          Rails.logger.error "JSON解析エラー: #{e.message}, AI応答: #{ai_response}"
          nil
        end
      else
        Rails.logger.error "Google Maps クエリ生成API呼び出し失敗"
        nil
      end
    end

    private
  end
end

