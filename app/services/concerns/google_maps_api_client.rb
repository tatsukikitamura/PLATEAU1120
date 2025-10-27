require "net/http"
require "uri"
require "json"

module GoogleMapsApiClient
  extend ActiveSupport::Concern

  included do
    include ActiveModel::Model
    include ActiveModel::Attributes

    attribute :api_key, default: -> { ENV["GOOGLE_MAPS_API_KEY"] }
  end

  BASE_URL = "https://maps.googleapis.com/maps/api"

  # 初期化時のAPIキー検証
  def validate_api_key
    return unless Rails.env.development?

    Rails.logger.info "=== #{self.class.name} Initialization ==="
    Rails.logger.info "api_key present?: #{api_key.present?}"
    Rails.logger.info "api_key value: #{api_key.inspect}"
    Rails.logger.info "api_key length: #{api_key&.length}"
    Rails.logger.info "================================"

    if api_key.blank?
      Rails.logger.error "#{self.class.name}: API key is blank!"
      raise ArgumentError, "Google Maps API key is required"
    else
      Rails.logger.info "#{self.class.name}: API key is properly set" if Rails.env.development?
    end
  end

  # HTTPリクエストを実行（Google Maps API用 - GETリクエスト）
  def make_request(endpoint, params)
    uri = URI("#{BASE_URL}#{endpoint}")
    uri.query = URI.encode_www_form(params)

    log_request_info(uri, params)

    response = Net::HTTP.get_response(uri)

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
      
      if Rails.env.development?
        Rails.logger.info "=== Parsed Response ==="
        Rails.logger.info "Parsed: #{parsed_response.inspect}"
        Rails.logger.info "======================"
      end
      
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

