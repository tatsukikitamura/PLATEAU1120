require_relative "../concerns/deepseek_api_client"

module Deepseek
  class DataSelectorService
    include DeepseekApiClient

    def initialize(attributes = {})
      super(attributes) if defined?(super)
      validate_api_key
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

    private

    # キーワードを抽出
    def self.extract_keywords(message)
      keywords = []

      # データタイプのキーワードマッピング
      type_keywords = {
        "公園" => [ "park", "Point" ],
        "パーク" => [ "park", "Point" ],
        "park" => [ "park", "Point" ],
        "ランドマーク" => [ "landmark", "Point" ],
        "landmark" => [ "landmark", "Point" ],
        "避難所" => [ "shelter", "Point" ],
        "shelter" => [ "shelter", "Point" ],
        "駅" => [ "station", "Point" ],
        "ステーション" => [ "station", "Point" ],
        "station" => [ "station", "Point" ],
        "道路" => [ "border", "MultiLineString" ],
        "border" => [ "border", "MultiLineString" ],
        "避難路" => [ "emergency_route", "MultiLineString" ],
        "emergency" => [ "emergency_route", "MultiLineString" ],
        "鉄道" => [ "railway", "MultiLineString" ],
        "railway" => [ "railway", "MultiLineString" ],
        "建物" => [ "3DTiles", "OSM" ],
        "building" => [ "3DTiles", "OSM" ]
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
          keywords << [ data.name, data.data_type ]
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
  end
end

