class Api::GeoJsonDataController < ApplicationController
  before_action :set_geo_json_data, only: [ :show, :apply_filter ]

  # GET /api/geo_json_data
  def index
    @geo_json_data = GeoJsonData.visible.ordered

    # データ型でフィルタリング
    if params[:data_type].present?
      @geo_json_data = @geo_json_data.by_data_type(params[:data_type])
    end

    # 検索
    if params[:search].present?
      @geo_json_data = @geo_json_data.where("UPPER(name) LIKE UPPER(?)", "%#{params[:search]}%")
    end

    render json: {
      data: @geo_json_data.map(&:as_json),
      meta: {
        total: @geo_json_data.count,
        data_types: GeoJsonData.distinct.pluck(:data_type)
      }
    }
  end

  # GET /api/geo_json_data/:id
  def show
    if @geo_json_data
      # ファイルの内容を読み込む
      file_path = Rails.root.join("public", @geo_json_data.file_path)
      if File.exist?(file_path)
        geojson_content = File.read(file_path)
        geojson_data = JSON.parse(geojson_content)

        # 統計情報を取得
        processor = GeoJsonProcessor.new
        stats = processor.get_statistics(geojson_data)

        render json: {
          geo_json_data: @geo_json_data.as_json,
          geojson_content: geojson_data,
          statistics: stats
        }
      else
        render json: { error: "ファイルが見つかりません" }, status: :not_found
      end
    else
      render json: { error: "データが見つかりません" }, status: :not_found
    end
  end

  # POST /api/geo_json_data/:id/apply_filter
  def apply_filter
    if @geo_json_data
      # フィルタ条件を取得
      filter_condition_ids = params[:filter_condition_ids] || []
      filter_conditions = FilterCondition.where(id: filter_condition_ids, active: true)

      # ファイルの内容を読み込む
      file_path = Rails.root.join("public", @geo_json_data.file_path)
      if File.exist?(file_path)
        geojson_content = File.read(file_path)
        geojson_data = JSON.parse(geojson_content)

        # フィルタを適用
        processor = GeoJsonProcessor.new
        filtered_data = processor.apply_filters(geojson_data, filter_conditions)

        render json: {
          original_data: geojson_data,
          filtered_data: filtered_data,
          applied_filters: filter_conditions.map(&:as_json),
          statistics: {
            original_count: geojson_data["features"]&.count || 0,
            filtered_count: filtered_data["features"]&.count || 0
          }
        }
      else
        render json: { error: "ファイルが見つかりません" }, status: :not_found
      end
    else
      render json: { error: "データが見つかりません" }, status: :not_found
    end
  end

  # GET /api/geo_json_data/statistics
  def statistics
    stats = GeoJsonData.stats

    # データ型別の詳細統計
    detailed_stats = {}
    GeoJsonData::DATA_TYPES.each do |data_type|
      data = GeoJsonData.by_data_type(data_type)
      detailed_stats[data_type] = {
        total: data.count,
        visible: data.visible.count,
        hidden: data.where(visible: false).count
      }
    end

    render json: {
      overall: stats,
      by_data_type: detailed_stats
    }
  end

  private

  def set_geo_json_data
    @geo_json_data = GeoJsonData.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    @geo_json_data = nil
  end
end
