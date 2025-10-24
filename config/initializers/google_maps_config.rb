# Google Maps API Configuration Checker
Rails.application.config.after_initialize do
  Rails.logger.info "=== Google Maps API Configuration Check ==="
  Rails.logger.info "Environment: #{Rails.env}"
  Rails.logger.info "ENV['GOOGLE_MAPS_API_KEY'] present?: #{ENV['GOOGLE_MAPS_API_KEY'].present?}"
  Rails.logger.info "ENV['GOOGLE_MAPS_API_KEY'] value: #{ENV['GOOGLE_MAPS_API_KEY'].inspect}"
  Rails.logger.info "ENV['GOOGLE_MAPS_API_KEY'] length: #{ENV['GOOGLE_MAPS_API_KEY']&.length}"

  # .envファイルの存在確認
  env_file_path = Rails.root.join(".env")
  Rails.logger.info ".env file exists?: #{File.exist?(env_file_path)}"

  if File.exist?(env_file_path)
    Rails.logger.info ".env file content (first 100 chars): #{File.read(env_file_path)[0..100].inspect}"
  end

  Rails.logger.info "=========================================="
end
