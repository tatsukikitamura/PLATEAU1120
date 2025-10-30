require_relative "../concerns/deepseek_api_client"

module Deepseek
  class ChatService
    include DeepseekApiClient

    def initialize(attributes = {})
      super(attributes) if defined?(super)
      validate_api_key
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
          [ { role: "system", content: full_system_prompt } ] + messages
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
end

