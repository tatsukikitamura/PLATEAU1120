require "net/http"
require "uri"
require "json"

module FastApiClient
  extend ActiveSupport::Concern

  included do
    include ActiveModel::Model
    include ActiveModel::Attributes

    attribute :base_url, default: -> { ENV["FASTAPI_URL"] || "http://localhost:8000" }
  end

  # HTTPリクエストを実行（FastAPI用）
  def make_request(method, endpoint, params = nil)
    base = base_url.end_with?("/") ? base_url[0..-2] : base_url
    uri = URI("#{base}#{endpoint}")

    log_request_info(uri, method, params)

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.open_timeout = 30
    http.read_timeout = 60

    case method.upcase
    when "GET"
      request = Net::HTTP::Get.new(uri)
      uri.query = URI.encode_www_form(params) if params
    when "POST"
      request = Net::HTTP::Post.new(uri)
      request["Content-Type"] = "application/json"
      request.body = params.to_json if params
    when "DELETE"
      request = Net::HTTP::Delete.new(uri)
    else
      raise ArgumentError, "Unsupported HTTP method: #{method}"
    end

    response = http.request(request)

    log_response_info(response)

    parse_response(response)
  rescue => e
    handle_request_error(e)
    nil
  end

  private

  # リクエスト情報をログ出力（削除）
  def log_request_info(uri, method, params)
    # ログ出力を削除してコンソール出力を減らす
  end

  # レスポンス情報をログ出力（削除）
  def log_response_info(response)
    # ログ出力を削除してコンソール出力を減らす
  end

  # レスポンスをパース
  def parse_response(response)
    if response.code.to_i >= 200 && response.code.to_i < 300
      begin
        JSON.parse(response.body)
      rescue JSON::ParserError => e
        Rails.logger.error "FastAPI JSON parse error: #{e.message}"
        Rails.logger.error "Response body: #{response.body}"
        nil
      end
    else
      # エラー詳細をログ出力（422エラーなど）
      Rails.logger.error "FastAPI request error: #{response.code}"
      begin
        error_body = JSON.parse(response.body)
        Rails.logger.error "Error details: #{error_body.inspect}"
      rescue JSON::ParserError
        Rails.logger.error "Response body: #{response.body}"
      end
      nil
    end
  end

  # リクエストエラーを処理
  def handle_request_error(error)
    Rails.logger.error "FastAPI request error: #{error.message}"
    # バックトレースはdebugレベルのみ
    Rails.logger.debug "Error backtrace: #{error.backtrace.join("\n")}" if Rails.env.development?
  end
end

