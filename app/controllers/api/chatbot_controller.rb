class Api::ChatbotController < ApplicationController
  include ApiResponseHelper
  include ApiKeyValidator

  before_action :validate_api_key_method

  # POST /api/chatbot/select_data
  # 1段階目: データ選択のみ
  def select_data
    if params[:user_query].blank?
      render json: {
        success: false,
        error: "ユーザークエリが必要です"
      }, status: :bad_request
      return
    end

    user_query = params[:user_query]

    service = Deepseek::DataSelectorService.new
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
      query_generator = GoogleMaps::QueryGeneratorService.new
      google_maps_query = query_generator.generate_query(user_query)
    else
      # 通常のAI判定
      map_determiner = Common::MapDisplayDeterminer.new
      should_display_on_map = map_determiner.should_display_on_map?(user_query)

      google_maps_determiner = Deepseek::DeterminerService.new
      should_use_google_maps = google_maps_determiner.should_use_google_maps?(user_query)

      google_maps_query = nil
      if should_use_google_maps
        query_generator = GoogleMaps::QueryGeneratorService.new
        google_maps_query = query_generator.generate_query(user_query)
      end
    end

    render json: {
      success: true,
      selected_data: selected_data_info,
      should_display_on_map: should_display_on_map,
      should_use_google_maps: should_use_google_maps,
      google_maps_query: google_maps_query
    }, status: :ok
  end

  # POST /api/chatbot/generate_response
  # 2段階目: AI回答生成
  def generate_response
    messages = params[:messages] || []
    selected_data_info = params[:selected_data] || []
    google_maps_query = params[:google_maps_query]

    if messages.blank?
      render json: {
        success: false,
        error: "メッセージが必要です"
      }, status: :bad_request
      return
    end

    service = Deepseek::ChatService.new

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
      
      # AIにコンテキストを提供して文脈を踏まえた回答を生成
      if google_maps_query.present?
        context_prompt = build_google_maps_context(google_maps_query)
        response = service.chat(messages, system_prompt: context_prompt)
      else
        # Google Mapsクエリがない場合は従来のメッセージ
        response = "申し訳ございません。該当するPLATEAUデータが見つかりませんでした。マップに表示されたGoogle Mapsの検索結果をご覧ください。"
      end
    else
      # 選択されたデータで回答生成
      response = service.chat_with_selected_data(messages, selected_data)
    end

    if response
      render json: {
        success: true,
        response: response
      }, status: :ok
    else
      render json: {
        success: false,
        error: "チャットボットからの応答を取得できませんでした"
      }, status: :service_unavailable
    end
  rescue ArgumentError => e
    render json: {
      success: false,
      error: "APIキーが設定されていません: #{e.message}"
    }, status: :unauthorized
  end

  private

  def required_api_keys
    ["DEEPSEEK_API_KEY"]
  end

  def validate_api_key_method
    validate_api_keys
  end

  # Google MapsクエリからAI用のコンテキストを構築
  def build_google_maps_context(google_maps_query)
    query_type = google_maps_query["type"] || "unknown"
    query_text = google_maps_query["query"] || ""
    
    context = <<~CONTEXT
      ユーザーの質問に対して、該当するPLATEAUデータが見つかりませんでした。
      代わりにGoogle Maps APIで#{query_type}検索を行い、マップに表示しています。
      
      検索内容: #{query_text}
      
      以下の点を考慮して回答してください:
      1. ユーザーの質問意図を理解して回答する
      2. マップにGoogle Mapsの検索結果が表示されていることを伝える
      3. 謝罪は不要。状況を自然に説明する
      4. 必要に応じて、検索結果の見方や活用方法を案内する
      
      簡潔で親切な日本語で回答してください。
    CONTEXT

    context
  end
end
