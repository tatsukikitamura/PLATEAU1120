module ApiKeyValidator
  extend ActiveSupport::Concern

  private

  # 環境変数から必要なAPIキーを定義
  # 各コントローラーでoverrideする
  def required_api_keys
    []
  end

  def validate_api_keys
    required_api_keys.each do |key_name|
      unless ENV[key_name].present?
        render json: {
          success: false,
          error: "#{key_name}が設定されていません"
        }, status: :unauthorized
        return false
      end
    end
    true
  end
end

