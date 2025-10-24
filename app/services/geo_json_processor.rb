class GeoJsonProcessor
  include ActiveModel::Model
  include ActiveModel::Attributes
  
  attribute :data, default: nil
  attribute :filters, default: []
  attribute :viewer, default: nil
  
  def initialize(attributes = {})
    super
    @data ||= []
    @filters ||= []
  end
  
  # GeoJSONデータの読み込み
  def load_geojson_data(file_path)
    return nil unless File.exist?(Rails.root.join('public', file_path))
    
    begin
      file_content = File.read(Rails.root.join('public', file_path))
      JSON.parse(file_content)
    rescue JSON::ParserError => e
      Rails.logger.error "GeoJSON parse error: #{e.message}"
      nil
    rescue => e
      Rails.logger.error "File read error: #{e.message}"
      nil
    end
  end
  
  # フィルタの適用
  def apply_filters(geojson_data, filter_conditions = [])
    return geojson_data if filter_conditions.blank?
    
    filtered_data = geojson_data.dup
    
    filter_conditions.each do |condition|
      next unless condition.is_a?(FilterCondition) && condition.active?
      
      filtered_data = condition.apply_to_geojson(filtered_data)
    end
    
    filtered_data
  end
  
  # スキーマの検証
  def validate_schema(geojson_data)
    return { valid: false, errors: ['データが空です'] } if geojson_data.blank?
    
    errors = []
    
    # GeoJSONの基本構造チェック
    unless geojson_data.is_a?(Hash)
      errors << 'GeoJSONはオブジェクトである必要があります'
      return { valid: false, errors: errors }
    end
    
    unless geojson_data['type'] == 'FeatureCollection'
      errors << 'typeはFeatureCollectionである必要があります'
    end
    
    unless geojson_data['features'].is_a?(Array)
      errors << 'featuresは配列である必要があります'
    end
    
    # 各フィーチャーの検証
    if geojson_data['features'].is_a?(Array)
      geojson_data['features'].each_with_index do |feature, index|
        feature_errors = validate_feature(feature)
        unless feature_errors.empty?
          errors << "Feature #{index}: #{feature_errors.join(', ')}"
        end
      end
    end
    
    { valid: errors.empty?, errors: errors }
  end
  
  # フィーチャーの検証
  def validate_feature(feature)
    errors = []
    
    unless feature.is_a?(Hash)
      errors << 'Featureはオブジェクトである必要があります'
      return errors
    end
    
    unless feature['type'] == 'Feature'
      errors << 'typeはFeatureである必要があります'
    end
    
    unless feature['geometry'].is_a?(Hash)
      errors << 'geometryはオブジェクトである必要があります'
    end
    
    unless feature['properties'].is_a?(Hash)
      errors << 'propertiesはオブジェクトである必要があります'
    end
    
    errors
  end
  
  # データの統計情報を取得
  def get_statistics(geojson_data)
    return {} if geojson_data.blank? || !geojson_data['features'].is_a?(Array)
    
    features = geojson_data['features']
    
    {
      total_features: features.count,
      geometry_types: features.map { |f| f.dig('geometry', 'type') }.compact.uniq,
      property_keys: features.flat_map { |f| f.dig('properties')&.keys || [] }.uniq,
      bounds: calculate_bounds(features)
    }
  end
  
  # バウンディングボックスの計算
  def calculate_bounds(features)
    return nil if features.blank?
    
    coordinates = features.flat_map do |feature|
      geometry = feature['geometry']
      next [] unless geometry
    
      case geometry['type']
      when 'Point'
        [geometry['coordinates']]
      when 'LineString'
        geometry['coordinates']
      when 'MultiLineString'
        geometry['coordinates'].flatten(1)
      when 'Polygon'
        geometry['coordinates'].flatten(1)
      when 'MultiPolygon'
        geometry['coordinates'].flatten(2)
      else
        []
      end
    end
    
    return nil if coordinates.empty?
    
    lngs = coordinates.map { |coord| coord[0] }
    lats = coordinates.map { |coord| coord[1] }
    
    {
      min_lng: lngs.min,
      max_lng: lngs.max,
      min_lat: lats.min,
      max_lat: lats.max
    }
  end
  
  # Cesium用のデータソース作成
  def create_cesium_data_source(geojson_data, options = {})
    return nil unless @viewer
    
    begin
      # オプションの設定
      cesium_options = {
        clampToGround: options[:clamp_to_ground] || false,
        stroke: options[:stroke] || '#FF0000',
        fill: options[:fill] || '#FF0000',
        strokeWidth: options[:stroke_width] || 2
      }
      
      # GeoJSONデータをCesiumで読み込み
      data_source = Cesium.GeoJsonDataSource.load(geojson_data, cesium_options)
      
      # データソースに名前を設定
      data_source._name = options[:name] || "GeoJSON_#{Time.current.to_i}"
      
      data_source
    rescue => e
      Rails.logger.error "Cesium data source creation error: #{e.message}"
      nil
    end
  end
  
  # Leaflet用のレイヤー作成
  def create_leaflet_layer(geojson_data, options = {})
    return nil unless defined?(L)
    
    begin
      # スタイル設定
      style = {
        color: options[:color] || '#FF0000',
        weight: options[:weight] || 2,
        opacity: options[:opacity] || 1.0,
        fillOpacity: options[:fill_opacity] || 0.3
      }
      
      # GeoJSONレイヤーを作成
      layer = L.geoJSON(geojson_data, {
        style: style,
        pointToLayer: options[:point_to_layer],
        onEachFeature: options[:on_each_feature]
      })
      
      layer
    rescue => e
      Rails.logger.error "Leaflet layer creation error: #{e.message}"
      nil
    end
  end
  
  # データのエクスポート
  def export_data(geojson_data, format = :json)
    case format
    when :json
      geojson_data.to_json
    when :csv
      export_to_csv(geojson_data)
    when :kml
      export_to_kml(geojson_data)
    else
      raise ArgumentError, "Unsupported format: #{format}"
    end
  end
  
  private
  
  def export_to_csv(geojson_data)
    return '' unless geojson_data['features'].is_a?(Array)
    
    features = geojson_data['features']
    return '' if features.empty?
    
    # プロパティのキーを取得
    property_keys = features.flat_map { |f| f.dig('properties')&.keys || [] }.uniq
    
    # CSVヘッダー
    headers = ['id', 'type', 'longitude', 'latitude'] + property_keys
    
    # CSVデータ
    csv_data = CSV.generate do |csv|
      csv << headers
      
      features.each_with_index do |feature, index|
        geometry = feature['geometry']
        properties = feature['properties'] || {}
        
        # 座標の取得
        coords = case geometry&.dig('type')
        when 'Point'
          geometry['coordinates']
        when 'LineString', 'Polygon'
          geometry['coordinates'].first
        else
          [nil, nil]
        end
        
        row = [
          feature['id'] || index,
          geometry&.dig('type'),
          coords&.first,
          coords&.last
        ] + property_keys.map { |key| properties[key] }
        
        csv << row
      end
    end
    
    csv_data
  end
  
  def export_to_kml(geojson_data)
    # KMLエクスポートの実装（簡易版）
    # 実際の実装では、geojson2kml gemなどを使用することを推奨
    "KML export not implemented yet"
  end
end
