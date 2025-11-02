require_relative '../../services/concerns/fastapi_client'

class Api::ChatbotController < ApplicationController
  include ApiResponseHelper
  include ApiKeyValidator
  include FastApiClient

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

    # FastAPIにデータ選択をリクエスト
    fastapi_response = make_request(
      "POST",
      "/api/data-selector/",
      {
        user_query: user_query,
        available_data: nil  # Rails APIから自動取得
      }
    )

    # FastAPIからのレスポンスを処理
    if fastapi_response && fastapi_response["success"]
      selected_names = fastapi_response["selected_data"] || []
      
      # 選択されたデータ名から実際のGeoJsonDataレコードを取得
      selected_data = []
      selected_names.each do |name|
        data = GeoJsonData.find_by(name: name)
        selected_data << data if data
      end

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

        # Google Mapsクエリを生成（FastAPI経由）
        query_generation_response = make_request(
          "POST",
          "/api/google-maps/generate-query",
          { user_query: user_query }
        )
        google_maps_query = query_generation_response&.dig("query_data")
      else
        # 通常のAI判定（FastAPI経由）
        map_display_response = make_request(
          "POST",
          "/api/determiner/map-display",
          { user_query: user_query }
        )
        
        google_maps_response = make_request(
          "POST",
          "/api/determiner/google-maps",
          { user_query: user_query }
        )

        should_display_on_map = map_display_response&.dig("result") || false
        should_use_google_maps = google_maps_response&.dig("result") || false

        google_maps_query = nil
        if should_use_google_maps
          # Google Mapsクエリを生成（FastAPI経由）
          query_generation_response = make_request(
            "POST",
            "/api/google-maps/generate-query",
            { user_query: user_query }
          )
          google_maps_query = query_generation_response&.dig("query_data")
        end
      end

      render json: {
        success: true,
        selected_data: selected_data_info,
        should_display_on_map: should_display_on_map,
        should_use_google_maps: should_use_google_maps,
        google_maps_query: google_maps_query
      }, status: :ok
    else
      # FastAPI呼び出し失敗
      Rails.logger.error "FastAPI data selection failed: #{fastapi_response.inspect}"
      render json: {
        success: false,
        error: "データ選択に失敗しました"
      }, status: :service_unavailable
    end
  end

  # POST /api/chatbot/generate_response
  # 2段階目: AI回答生成
  def generate_response
    messages = params[:messages] || []
    selected_data_info = params[:selected_data] || []
    google_maps_query = params[:google_maps_query]
    session_id = params[:session_id]

    if messages.blank?
      render json: {
        success: false,
        error: "メッセージが必要です"
      }, status: :bad_request
      return
    end

    # 選択されたデータ情報から実際のレコードを取得
    selected_data = []
    if selected_data_info.present?
      selected_data_info.each do |info|
        data = GeoJsonData.find_by(name: info["name"])
        selected_data << data if data
      end
    end

    # メッセージをFastAPI形式に変換
    formatted_messages = messages.map do |msg|
      # シンボルキーと文字列キーの両方をチェック
      role = msg[:role] || msg["role"]
      content = msg[:content] || msg["content"] || ""
      
      # roleとcontentが存在することを確認
      if role.blank? || content.blank?
        Rails.logger.warn "Invalid message format: #{msg.inspect}"
        next
      end
      
      {
        role: role.to_s,
        content: content.to_s
      }
    end.compact  # nilを除去
    
    # formatted_messagesが空の場合はエラー
    if formatted_messages.empty?
      render json: {
        success: false,
        error: "有効なメッセージが見つかりませんでした"
      }, status: :bad_request
      return
    end

    # FastAPIにチャットをリクエスト
    chat_params = {
      messages: formatted_messages
    }
    
    # session_idが存在する場合のみ追加
    chat_params[:session_id] = session_id if session_id.present?

    # 選択されたデータがある場合は含める
    if selected_data.present?
      chat_params[:selected_data] = selected_data.map do |data|
        # schema_summaryが文字列の場合はJSONパースしてから送信
        schema_summary = data.schema_summary
        if schema_summary.is_a?(String)
          begin
            schema_summary = JSON.parse(schema_summary) if schema_summary.present?
          rescue JSON::ParserError
            schema_summary = nil
          end
        end
        
        {
          name: data.name,
          data_type: data.data_type,
          schema_summary: schema_summary
        }
      end
    else
      # selected_dataが空の場合はキー自体を削除
      # chat_paramsに追加しない（nilも送らない）
      
      # データが空の場合の処理
      # AIにコンテキストを提供して文脈を踏まえた回答を生成
      if google_maps_query.present?
        context_prompt = build_google_maps_context(google_maps_query)
        chat_params[:system_prompt] = context_prompt if context_prompt.present?
      else
        # Google Mapsクエリがない場合は従来のメッセージ
        chat_params[:system_prompt] = "申し訳ございません。該当するPLATEAUデータが見つかりませんでした。マップに表示されたGoogle Mapsの検索結果をご覧ください。"
      end
    end
    
    # system_promptが空の場合は削除
    chat_params.delete(:system_prompt) if chat_params[:system_prompt].blank?

    # FastAPIにチャットリクエストを送信
    fastapi_response = make_request(
      "POST",
      "/api/chat/",
      chat_params
    )

    if fastapi_response && fastapi_response["success"]
      response = fastapi_response["response"]
      
      render json: {
        success: true,
        response: response
      }, status: :ok
    else
      # FastAPI呼び出し失敗
      Rails.logger.error "FastAPI chat failed: #{fastapi_response.inspect}"
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
