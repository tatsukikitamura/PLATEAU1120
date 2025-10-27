class Api::ChatbotController < ApplicationController
  before_action :validate_api_key

  # POST /api/chatbot/select_data
  # 1段階目: データ選択のみ
  def select_data
    user_query = params[:user_query]

    if user_query.blank?
      render json: { error: "ユーザークエリが必要です" }, status: :bad_request
      return
    end

    service = Api::DeepseekChatService.new
    selected_data = service.select_relevant_data(user_query)

    # 選択されたデータの情報を構築
    selected_data_info = selected_data.map do |data|
      {
        name: data.name,
        data_type: data.data_type,
        schema_summary: data.schema_summary
      }
    end

    # データが見つからない場合の処理
    if selected_data.empty?
      # Google Maps判定を強制的にtrueに
      should_use_google_maps = true
      should_display_on_map = true

      # Google Mapsクエリを生成
      query_generator = Api::GoogleMapsQueryGenerator.new
      google_maps_query = query_generator.generate_query(user_query)
    else
      # 通常のAI判定
      map_determiner = Api::MapDisplayDeterminer.new
      should_display_on_map = map_determiner.should_display_on_map?(user_query)

      google_maps_determiner = Api::GoogleMapsDeterminer.new
      should_use_google_maps = google_maps_determiner.should_use_google_maps?(user_query)

      google_maps_query = nil
      if should_use_google_maps
        query_generator = Api::GoogleMapsQueryGenerator.new
        google_maps_query = query_generator.generate_query(user_query)
      end
    end

    render json: {
      success: true,
      selected_data: selected_data_info,
      should_display_on_map: should_display_on_map,
      should_use_google_maps: should_use_google_maps,
      google_maps_query: google_maps_query,
      timestamp: Time.current.iso8601
    }
  rescue => e
    Rails.logger.error "Data selection error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")

    render json: {
      error: "データ選択でエラーが発生しました",
      success: false
    }, status: :internal_server_error
  end

  # POST /api/chatbot/generate_response
  # 2段階目: AI回答生成
  def generate_response
    messages = params[:messages] || []
    selected_data_info = params[:selected_data] || []

    if messages.empty?
      render json: { error: "メッセージが必要です" }, status: :bad_request
      return
    end

    service = Api::DeepseekChatService.new

    # 選択されたデータ情報から実際のレコードを取得
    selected_data = []
    if selected_data_info.present?
      selected_data_info.each do |info|
        data = GeoJsonData.find_by(name: info["name"])
        selected_data << data if data
      end
    end

    # データが空の場合の処理
    if selected_data.empty?
      Rails.logger.warn "データが見つかりません。Google Maps APIを使用してください。"
      response = "申し訳ございません。該当するPLATEAUデータが見つかりませんでした。マップに表示されたGoogle Mapsの検索結果をご覧ください。"
    else
      # 選択されたデータで回答生成
      response = service.chat_with_selected_data(messages, selected_data)
    end

    if response
      render json: {
        success: true,
        response: response,
        timestamp: Time.current.iso8601
      }
    else
      render json: {
        error: "チャットボットからの応答を取得できませんでした",
        success: false
      }, status: :service_unavailable
    end
  rescue ArgumentError => e
    render json: {
      error: "APIキーが設定されていません: #{e.message}",
      success: false
    }, status: :unauthorized
  rescue => e
    Rails.logger.error "Chatbot error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")

    render json: {
      error: "チャットボットでエラーが発生しました",
      success: false
    }, status: :internal_server_error
  end

  private

  def validate_api_key
    unless ENV["DEEPSEEK_API_KEY"].present?
      render json: {
        error: "DEEPSEEK_API_KEYが設定されていません",
        success: false
      }, status: :unauthorized
    end
  end
end
