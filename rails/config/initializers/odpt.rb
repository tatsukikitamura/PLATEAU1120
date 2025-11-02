# ODPT (Public Transportation Open Data Challenge) configuration
Rails.application.configure do
  config.x.odpt = ActiveSupport::OrderedOptions.new
  config.x.odpt.base_url = "https://api.odpt.org/api/v4/"
  # ODPTはクエリに consumerKey を付与する形式（acl: consumerKey="..."）
  config.x.odpt.consumer_key = ENV["ODPT_API_KEY"]
end
