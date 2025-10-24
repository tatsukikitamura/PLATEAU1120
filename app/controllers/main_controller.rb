class MainController < ApplicationController
  before_action :load_geojson_data, only: [:cesium, :map2d, :tourist_route]
  before_action :load_filter_conditions, only: [:cesium, :map2d, :tourist_route]
  
  def home
    # ホームページ（3D/2D選択画面）
    @available_data_types = GeoJsonData.distinct.pluck(:data_type).compact
    @data_stats = GeoJsonData.stats
  end

  def cesium
    # Cesium 3Dビュー
    @point_data = @geojson_data.by_data_type('Point').visible.ordered
    @line_data = @geojson_data.by_data_type('MultiLineString').visible.ordered
    @tileset_data = @geojson_data.by_data_type('3DTiles').visible.ordered
    @osm_data = @geojson_data.by_data_type('OSM').visible.ordered
    
    ensure_default_filters
  end

  def map2d
    # Leaflet 2Dマップビュー
    @point_data = @geojson_data.by_data_type('Point').visible.ordered
    @line_data = @geojson_data.by_data_type('MultiLineString').visible.ordered
    @data_types = @geojson_data.distinct.pluck(:data_type).compact

    ensure_default_filters
  end

  def tourist_route
    # 観光ルート最適化AIページ
    @landmarks = @geojson_data.by_data_type('Point').visible.ordered
    @routes = @geojson_data.by_data_type('MultiLineString').visible.ordered
    
    # 観光地の統計情報
    @landmark_stats = {
      total: @landmarks.count,
      by_type: @landmarks.group(:name).count
    }
  end

  def info
    # プロジェクト概要ページ
    @project_stats = {
      total_datasets: GeoJsonData.count,
      visible_datasets: GeoJsonData.visible.count,
      data_types: GeoJsonData.group(:data_type).count,
      filter_conditions: FilterCondition.count,
      last_updated: GeoJsonData.maximum(:updated_at)
    }
    
    # データの詳細統計
    @detailed_stats = GeoJsonData.stats
  end
  
  # データの再読み込み
  def reload_data
    begin
      loaded_data = GeoJsonData.load_from_public_files
      redirect_to root_path, notice: "#{loaded_data.count}件のデータを読み込みました"
    rescue => e
      redirect_to root_path, alert: "データの読み込みに失敗しました: #{e.message}"
    end
  end
  
  private
  
  def load_geojson_data
    @geojson_data = GeoJsonData.visible.ordered
    
    # データが空の場合は自動的に読み込み
    if @geojson_data.empty?
      @geojson_data = GeoJsonData.load_from_public_files
    end
  end
  
  def load_filter_conditions
    @filter_conditions = FilterCondition.active.ordered
    
    # デフォルトフィルタの作成（初回のみ）
    if @filter_conditions.empty?
      @filter_conditions = FilterCondition.create_default_filters
    end
  end

  # デフォルトフィルタの作成（重複処理を統合）
  def ensure_default_filters
    FilterCondition.create_default_filters if FilterCondition.count == 0
  end
end
