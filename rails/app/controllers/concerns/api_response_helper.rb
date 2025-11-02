module ApiResponseHelper
  extend ActiveSupport::Concern

  included do
    rescue_from StandardError, with: :handle_standard_error
  end

  private

  # 成功レスポンスを生成
  def render_success(data, message: nil, status: :ok)
    response = { success: true, data: data }
    response[:message] = message if message.present?
    response[:timestamp] = Time.current.iso8601

    render json: response, status: status
  end

  # エラーレスポンスを生成
  def render_error(message, status: :bad_request, errors: nil)
    response = {
      success: false,
      error: message
    }
    response[:errors] = errors if errors.present?
    response[:timestamp] = Time.current.iso8601

    render json: response, status: status
  end

  # パラメータが空かどうかをチェック
  def validate_presence(param_value, error_message)
    if param_value.blank?
      render_error(error_message, status: :bad_request)
      return false
    end
    true
  end

  # レコードが見つからない場合の処理
  def render_not_found(message = "レコードが見つかりません")
    render_error(message, status: :not_found)
  end

  # 標準エラーのハンドリング
  def handle_standard_error(e)
    Rails.logger.error "#{self.class.name} error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")

    render_error(
      "#{controller_name.humanize}でエラーが発生しました",
      status: :internal_server_error
    )
  end
end

