require "net/http"
require "uri"
require "json"

class Api::GoogleMapsDeterminer
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :api_key, default: -> { ENV["DEEPSEEK_API_KEY"] }

  BASE_URL = "https://api.deepseek.com"
  MODEL = "deepseek-chat"

  def initialize(attributes = {})
    super

    if api_key.blank?
      Rails.logger.error "DeepSeek API key is blank in GoogleMapsDeterminer!"
      raise ArgumentError, "DeepSeek API key is required"
    end
  end

  # AIに質問内容からGoogle Maps APIを使うべきかを判断させる
  def should_use_google_maps?(user_query)
    return false if user_query.blank?

    system_prompt = <<~PROMPT
      あなたは千葉市の地理空間データを扱うAIアシスタントです。
      ユーザーの質問内容を分析し、Google Maps API（Places検索、経路検索、住所検索）を使用する必要があるかを判断してください。

      以下の場合は true を返してください：
      - 店舗、レストラン、カフェ、ホテルなどの具体的な施設検索（「近くのレストラン」「カフェ」「コンビニ」など）
      - 経路やルートの検索（「AからBまでの道順」「ルート検索」など）
      - 住所から座標への変換が必要な質問
      - 観光スポット、イベント会場などの検索
      - 「どこにある」「位置を教えて」などの位置情報を求める質問（具体的地名を含む）

      以下の場合は false を返してください：
      - PLATEAUの地理空間データで答えられる質問（公園、駅、避難所など）
      - 千葉市が管理するデータに関する質問（建物、道路、鉄道など）
      - 統計情報、データ数の確認
      - システムの使い方、操作方法
      - 抽象的な質問（「観光地は？」など、具体的な施設名がない）

      回答は必ず true または false の文字列を返してください。理由や説明は不要です。
    PROMPT

    user_prompt = <<~PROMPT
      ユーザーの質問: #{user_query}

      この質問に回答するために、Google Maps API（Places、Directions、Geocoding）を使用する必要がありますか？
      true または false のみを返してください。
    PROMPT

    messages = [
      { role: "system", content: system_prompt },
      { role: "user", content: user_prompt }
    ]

    params = {
      model: MODEL,
      messages: messages,
      temperature: 0.1  # より確定的な回答を得るため
    }

    response = make_request("/v1/chat/completions", params)

    if response && response["choices"]&.first
      ai_response = response["choices"].first["message"]["content"].strip.downcase

      # 回答をパース
      case ai_response
      when "true"
        Rails.logger.info "AI判定: Google Maps API使用すべき (true)"
        true
      when "false"
        Rails.logger.info "AI判定: Google Maps API不要 (false)"
        false
      else
        # AIの回答が予期せぬ場合、デフォルトでfalse
        Rails.logger.warn "AI判定: 不明な回答 '#{ai_response}'、デフォルトfalse"
        false
      end
    else
      Rails.logger.error "Google Maps API判定API呼び出し失敗"
      false
    end
  end

  private

  # HTTPリクエストを実行
  def make_request(endpoint, params)
    uri = URI("#{BASE_URL}#{endpoint}")

    if Rails.env.development?
      Rails.logger.info "=== GoogleMapsDeterminer API Request ==="
      Rails.logger.info "URL: #{uri}"
      Rails.logger.info "Params: #{params.inspect}"
      Rails.logger.info "========================================"
    end

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 30
    http.read_timeout = 60

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request["Authorization"] = "Bearer #{api_key}"
    request.body = params.to_json

    response = http.request(request)

    if Rails.env.development?
      Rails.logger.info "=== GoogleMapsDeterminer API Response ==="
      Rails.logger.info "Status Code: #{response.code}"
      Rails.logger.info "Response Body: #{response.body}"
      Rails.logger.info "=========================================="
    end

    if response.code == "200"
      parsed_response = JSON.parse(response.body)
      parsed_response
    else
      Rails.logger.error "DeepSeek API error: #{response.code} - #{response.body}"
      nil
    end
  rescue => e
    Rails.logger.error "GoogleMapsDeterminer API request error: #{e.message}"
    Rails.logger.error "Error backtrace: #{e.backtrace.join("\n")}" if Rails.env.development?
    nil
  end
end
