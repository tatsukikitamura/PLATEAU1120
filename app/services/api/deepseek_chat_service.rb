require "net/http"
require "uri"
require "json"

class Api::DeepseekChatService
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :api_key, default: -> { ENV["DEEPSEEK_API_KEY"] }

  BASE_URL = "https://api.deepseek.com"
  MODEL = "deepseek-chat"

  def initialize(attributes = {})
    super

    if Rails.env.development?
      Rails.logger.info "=== DeepseekChatService Initialization ==="
      Rails.logger.info "api_key present?: #{api_key.present?}"
      Rails.logger.info "api_key value: #{api_key.inspect}"
      Rails.logger.info "api_key length: #{api_key&.length}"
      Rails.logger.info "=========================================="
    end

    if api_key.blank?
      Rails.logger.error "DeepSeek API key is blank in service!"
      raise ArgumentError, "DeepSeek API key is required"
    else
      Rails.logger.info "DeepSeek API key is properly set in service" if Rails.env.development?
    end
  end

  # チャットメッセージを送信
  def chat(messages, system_prompt: nil)
    # システムプロンプトを構築
    full_system_prompt = build_system_prompt(system_prompt)
    
    # messages配列の先頭にシステムメッセージを追加（既にsystemメッセージがない場合のみ）
    full_messages = if full_system_prompt.present?
      # 既存のmessagesにsystemメッセージが含まれていない場合のみ追加
      has_system = messages.any? { |msg| msg[:role] == "system" || msg["role"] == "system" }
      if has_system
        messages
      else
        [{ role: "system", content: full_system_prompt }] + messages
      end
    else
      messages
    end

    params = {
      model: MODEL,
      messages: full_messages
    }

    response = make_request("/v1/chat/completions", params)

    if response && response["choices"]&.first
      response["choices"].first["message"]["content"]
    else
      nil
    end
  end

  # 1回目API: ユーザーの質問から関連データを選択
  def select_relevant_data(user_message)
    return [] if user_message.blank?

    # キーワードマッチングで候補データを取得
    keywords = self.class.extract_keywords(user_message)
    candidate_data = self.class.find_relevant_data(keywords)
    
    # 候補がない場合は空配列を返す（全データではなく）
    if candidate_data.empty?
      candidate_data = []
    end

    # データリストとスキーマ概要を構築
    data_list_parts = []
    candidate_data.each do |data|
      schema = data.schema_summary_hash
      schema_text = "#{data.name} (#{data.data_type})"
      
      # スキーマ情報が存在する場合は追加
      if schema.present? && schema["properties"].present?
        prop_info = schema["properties"].map do |key, info|
          samples = info["samples"] || []
          samples_str = samples.length > 0 ? " 例: #{samples.join(', ')}" : ""
          desc = info["description"] || key
          "- #{desc} (#{info['type']})#{samples_str}"
        end.join("\n")
        
        schema_text += "\n  プロパティ:\n  #{prop_info}"
      end
      
      data_list_parts << schema_text
    end
    
    data_list = data_list_parts.join("\n\n")

    # DeepSeek APIにデータ選択を依頼
    system_prompt = <<~PROMPT
      あなたは千葉市の地理空間データを分析するAIアシスタントです。
      ユーザーの質問に関連するデータを選択してください。
      データのプロパティ情報を参考にして、ユーザーの質問に最も適したデータを選択してください。
    PROMPT

    user_prompt = <<~PROMPT
      利用可能なデータ:
      #{data_list}

      ユーザーの質問: #{user_message}

      この質問に関連するデータを選択してください。
      JSON形式で返してください: {"selected_data": ["data1", "data2"]}
      データ名のみを返してください。
    PROMPT

    messages = [
      { role: "system", content: system_prompt },
      { role: "user", content: user_prompt }
    ]

    params = {
      model: MODEL,
      messages: messages
    }

    response = make_request("/v1/chat/completions", params)

    if response && response["choices"]&.first
      ai_response = response["choices"].first["message"]["content"]
      
      # JSONを解析
      begin
        # JSONブロックを抽出
        json_match = ai_response.match(/\{[\s\S]*\}/)
        if json_match
          json_data = JSON.parse(json_match[0])
          selected_names = json_data["selected_data"] || []
          
          # データ名から実際のGeoJsonDataレコードを取得
          selected_records = []
          selected_names.each do |name|
            data = candidate_data.find { |d| d.name == name }
            selected_records << data if data
          end
          
          return selected_records unless selected_records.empty?
        end
      rescue JSON::ParserError => e
        Rails.logger.error "JSON解析エラー: #{e.message}"
        Rails.logger.error "AIレスポンス: #{ai_response}"
      end
      
      # JSON解析に失敗した場合は全データを返す
      Rails.logger.warn "JSON解析失敗、全データを使用"
      candidate_data
    else
      Rails.logger.error "データ選択API呼び出し失敗"
      []
    end
  end

  # 2回目API: 選択されたデータを使って回答生成
  def chat_with_selected_data(messages, selected_data)
    # 選択されたデータのコンテキストを構築
    data_context = if selected_data.present?
      build_data_context(selected_data)
    else
      self.class.get_data_context
    end

    # 既存のchatメソッドを利用
    self.chat(messages, system_prompt: data_context)
  end

  private

  # HTTPリクエストを実行
  def make_request(endpoint, params)
    uri = URI("#{BASE_URL}#{endpoint}")

    if Rails.env.development?
      Rails.logger.info "=== DeepSeek API Request ==="
      Rails.logger.info "URL: #{uri}"
      Rails.logger.info "Params: #{params.inspect}"
      Rails.logger.info "=============================="
    end

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 30
    http.read_timeout = 60

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request["Authorization"] = "Bearer #{api_key}"
    request.body = params.to_json

    response = http.request(request)

    if Rails.env.development?
      Rails.logger.info "=== DeepSeek API Response ==="
      Rails.logger.info "Status Code: #{response.code}"
      Rails.logger.info "Response Body: #{response.body}"
      Rails.logger.info "==============================="
    end

    if response.code == "200"
      parsed_response = JSON.parse(response.body)
      parsed_response
    else
      Rails.logger.error "DeepSeek API error: #{response.code} - #{response.body}"
      nil
    end
  rescue => e
    Rails.logger.error "DeepSeek API request error: #{e.message}"
    Rails.logger.error "Error backtrace: #{e.backtrace.join("\n")}" if Rails.env.development?
    nil
  end

  # システムプロンプトを構築
  def build_system_prompt(custom_prompt = nil)
    # 基本的なシステムプロンプト
    base_prompt = <<~SYSTEM_PROMPT
      あなたは千葉市の地理空間データを分析するAIアシスタントです。
      ユーザーの質問に対して、提供されたデータ情報に基づいて回答してください。
      
      提供されるデータタイプ:
      - Point: ポイントデータ（公園、駅など）
      - MultiLineString: ラインデータ（道路、鉄道など）
      - 3DTiles: 3D建物モデル
      - OSM: OSM建物データ
      
      回答は日本語で、簡潔に説明してください。
    SYSTEM_PROMPT

    # カスタムプロンプトがある場合は追加
    if custom_prompt.present?
      "#{base_prompt}\n\n追加情報:\n#{custom_prompt}"
    else
      base_prompt
    end
  end

  # 地理空間データのコンテキスト情報を取得
  def self.get_data_context
    stats = GeoJsonData.stats
    
    context = <<~CONTEXT
      データ統計情報:
      - 総データ数: #{stats[:total]}件
      - 表示データ数: #{stats[:visible]}件
      - 非表示データ数: #{stats[:hidden]}件
      
      データタイプ別:
    CONTEXT
    
    stats[:by_type].each do |type, count|
      context += "  - #{type}: #{count}件\n"
    end
    
    # 各種データ型の詳細情報
    context += "\n利用可能なデータ:\n"
    
    GeoJsonData::DATA_TYPES.each do |data_type|
      data = GeoJsonData.by_data_type(data_type).visible
      if data.any?
        context += "  - #{data_type}: #{data.pluck(:name).join(', ')}\n"
      end
    end
    
    context
  end

  # ユーザーの質問内容に基づいて関連するデータを選択
  def self.get_relevant_data_context(user_message)
    return get_data_context if user_message.blank?
    
    keywords = extract_keywords(user_message)
    relevant_data = find_relevant_data(keywords)
    
    return get_data_context if relevant_data.empty?
    
    context = build_relevant_context(relevant_data, keywords)
    context
  end

  private

  # キーワードを抽出
  def self.extract_keywords(message)
    keywords = []
    
    # データタイプのキーワードマッピング
    type_keywords = {
      '公園' => ['park', 'Point'],
      'パーク' => ['park', 'Point'],
      'park' => ['park', 'Point'],
      'ランドマーク' => ['landmark', 'Point'],
      'landmark' => ['landmark', 'Point'],
      '避難所' => ['shelter', 'Point'],
      'shelter' => ['shelter', 'Point'],
      '駅' => ['station', 'Point'],
      'ステーション' => ['station', 'Point'],
      'station' => ['station', 'Point'],
      '道路' => ['border', 'MultiLineString'],
      'border' => ['border', 'MultiLineString'],
      '避難路' => ['emergency_route', 'MultiLineString'],
      'emergency' => ['emergency_route', 'MultiLineString'],
      '鉄道' => ['railway', 'MultiLineString'],
      'railway' => ['railway', 'MultiLineString'],
      '建物' => ['3DTiles', 'OSM'],
      'building' => ['3DTiles', 'OSM']
    }
    
    # 日本語キーワードマッチング
    type_keywords.each do |keyword, data_info|
      if message.include?(keyword)
        keywords << data_info
      end
    end
    
    # 既存のデータ名と完全一致するかチェック
    all_data = GeoJsonData.visible
    all_data.each do |data|
      if message.downcase.include?(data.name.downcase)
        keywords << [data.name, data.data_type]
      end
    end
    
    keywords
  end

  # 関連データを検索
  def self.find_relevant_data(keywords)
    return [] if keywords.empty?
    
    relevant_records = []
    
    keywords.each do |keyword_info|
      next if keyword_info.nil? || keyword_info.empty?
      
      data_name = keyword_info[0]
      data_type = keyword_info[1]
      
      if data_type
        records = GeoJsonData.visible.by_data_type(data_type)
        records.each do |record|
          if data_name && record.name.downcase.include?(data_name.downcase)
            relevant_records << record unless relevant_records.include?(record)
          end
        end
        
        # データ型がマッチした場合は全て追加
        if data_name.nil? || data_name.empty?
          records.each do |record|
            relevant_records << record unless relevant_records.include?(record)
          end
        end
      end
    end
    
    relevant_records
  end

  # 関連コンテキストを構築
  def self.build_relevant_context(selected_data, keywords)
    context = <<~CONTEXT
      ユーザーの質問に関連するデータ:
    CONTEXT
    
    # 選択されたデータを整理
    grouped_data = selected_data.group_by(&:data_type)
    
    grouped_data.each do |data_type, records|
      context += "\n【#{data_type}】\n"
      records.each do |record|
        context += "  - #{record.name}\n"
        
        # スキーマ情報を追加
        schema = record.schema_summary_hash
        if schema.present?
          # feature_countを追加
          if schema["feature_count"].present?
            context += "    件数: #{schema['feature_count']}件\n"
          end
          
          if schema["properties"].present?
            schema["properties"].each do |key, info|
              desc = info["description"] || key
              type = info["type"] || "unknown"
              samples = info["samples"] || []
              samples_str = samples.length > 0 ? "\n      例: #{samples.join(', ')}" : ""
              context += "    + #{desc} (#{type})#{samples_str}\n"
            end
          end
        end
      end
    end
    
    context += "\n\n全体統計:\n"
    stats = GeoJsonData.stats
    context += "  - 総データ数: #{stats[:total]}件\n"
    context += "  - 表示データ数: #{stats[:visible]}件\n"
    context += "  - 選択された関連データ: #{selected_data.count}件\n"
    
    context
  end

  # 選択されたデータのコンテキストを構築
  def build_data_context(selected_data)
    context = <<~CONTEXT
      選択されたデータ:
    CONTEXT
    
    # 選択されたデータを整理
    grouped_data = selected_data.group_by(&:data_type)
    
    grouped_data.each do |data_type, records|
      context += "\n【#{data_type}】\n"
      records.each do |record|
        context += "  - #{record.name}\n"
        
        # スキーマ情報を追加
        schema = record.schema_summary_hash
        if schema.present?
          # feature_countを追加
          if schema["feature_count"].present?
            context += "    件数: #{schema['feature_count']}件\n"
          end
          
          if schema["properties"].present?
            schema["properties"].each do |key, info|
              desc = info["description"] || key
              type = info["type"] || "unknown"
              samples = info["samples"] || []
              samples_str = samples.length > 0 ? "\n      例: #{samples.join(', ')}" : ""
              context += "    + #{desc} (#{type})#{samples_str}\n"
            end
          end
        end
      end
    end
    
    context += "\n\n全体統計:\n"
    stats = GeoJsonData.stats
    context += "  - 総データ数: #{stats[:total]}件\n"
    context += "  - 表示データ数: #{stats[:visible]}件\n"
    context += "  - 選択されたデータ: #{selected_data.count}件\n"
    
    context
  end

end

