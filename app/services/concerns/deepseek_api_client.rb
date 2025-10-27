require "net/http"
require "uri"
require "json"

module DeepseekApiClient
  extend ActiveSupport::Concern

  included do
    include ActiveModel::Model
    include ActiveModel::Attributes

    attribute :api_key, default: -> { ENV["DEEPSEEK_API_KEY"] }
  end

  BASE_URL = "https://api.deepseek.com"
  MODEL = "deepseek-chat"

  # 初期化時のAPIキー検証
  def validate_api_key
    if api_key.blank?
      Rails.logger.error "#{self.class.name}: DeepSeek API key is blank!"
      raise ArgumentError, "DeepSeek API key is required"
    end
  end

  # HTTPリクエストを実行（DeepSeek API用）
  def make_request(endpoint, params)
    uri = URI("#{BASE_URL}#{endpoint}")

    log_request_info(uri, params)

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 30
    http.read_timeout = 60

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request["Authorization"] = "Bearer #{api_key}"
    request.body = params.to_json

    response = http.request(request)

    log_response_info(response)

    parse_response(response)
  rescue => e
    handle_request_error(e)
    nil
  end

  private

  # リクエスト情報をログ出力
  def log_request_info(uri, params)
    return unless Rails.env.development?

    Rails.logger.info "=== #{self.class.name} API Request ==="
    Rails.logger.info "URL: #{uri}"
    Rails.logger.info "Params: #{params.inspect}"
    Rails.logger.info "================================"
  end

  # レスポンス情報をログ出力
  def log_response_info(response)
    return unless Rails.env.development?

    Rails.logger.info "=== #{self.class.name} API Response ==="
    Rails.logger.info "Status Code: #{response.code}"
    Rails.logger.info "Response Body: #{response.body}"
    Rails.logger.info "================================"
  end

  # レスポンスをパース
  def parse_response(response)
    if response.code == "200"
      parsed_response = JSON.parse(response.body)
      parsed_response
    else
      Rails.logger.error "#{self.class.name}: API error #{response.code} - #{response.body}"
      nil
    end
  end

  # リクエストエラーを処理
  def handle_request_error(error)
    Rails.logger.error "#{self.class.name}: API request error - #{error.message}"
    Rails.logger.error "Error backtrace: #{error.backtrace.join("\n")}" if Rails.env.development?
  end
end

