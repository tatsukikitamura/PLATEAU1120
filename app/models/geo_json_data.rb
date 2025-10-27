class GeoJsonData < ApplicationRecord
  # バリデーション
  validates :name, presence: true, uniqueness: true
  validates :data_type, presence: true
  validates :file_path, presence: true
  validates :visible, inclusion: { in: [ true, false ] }

  # スコープ
  scope :by_data_type, ->(type) { where(data_type: type) }
  scope :visible, -> { where(visible: true) }
  scope :ordered, -> { order(:display_order, :name) }
  scope :by_type_and_visible, ->(type) { where(data_type: type, visible: true) }

  # データ型の定数
  DATA_TYPES = %w[Point MultiLineString 3DTiles OSM].freeze

  # プロパティのJSONパース
  def properties
    return {} if properties_json.blank?
    JSON.parse(properties_json)
  rescue JSON::ParserError
    {}
  end

  def properties=(hash)
    self.properties_json = hash.to_json
  end

  # メタデータのJSONパース
  def metadata
    return {} if self[:metadata].blank?
    JSON.parse(self[:metadata])
  rescue JSON::ParserError
    {}
  end

  def metadata=(hash)
    self[:metadata] = hash.to_json
  end

  # スキーマ概要のJSONパース
  def schema_summary_hash
    return {} if schema_summary.blank?
    JSON.parse(schema_summary)
  rescue JSON::ParserError
    {}
  end

  def schema_summary_hash=(hash)
    self.schema_summary = hash.to_json
  end

  # スキーマ概要を抽出
  def extract_schema_summary
    return {} unless file_exists?

    geojson_path = Rails.root.join("public", file_path)
    geojson_data = JSON.parse(File.read(geojson_path))

    # schemaファイルのパスを推測
    schema_path = schema_file_path
    schema_info = {}

    # schemaファイルが存在する場合は読み込む
    if schema_path && File.exist?(schema_path)
      schema_data = JSON.parse(File.read(schema_path))
      properties_def = schema_data["definitions"]["Properties"] rescue nil

      if properties_def && properties_def["properties"]
        schema_info = properties_def["properties"]
      end
    end

    # 実際のGeoJSONデータからサンプル値を抽出
    features = geojson_data["features"] || []
    feature_count = features.length

    properties_info = {}
    
    # 各フィーチャーのプロパティからサンプル値を収集
    features.take(100).each do |feature|
      props = feature["properties"] || {}
      props.each do |key, value|
        next if value.nil?
        
        unless properties_info[key]
          properties_info[key] = {
            "type" => value.class.name.downcase,
            "description" => get_property_description(key),
            "samples" => []
          }
        end
        
        # サンプル値を収集（最大3つ）
        if properties_info[key]["samples"].length < 3 && !properties_info[key]["samples"].include?(value)
          properties_info[key]["samples"] << value
        end
      end
    end

    # schemaファイルの情報と実データの情報をマージ
    properties_info.each do |key, info|
      if schema_info[key]
        info.merge!(schema_info[key])
      end
    end

    {
      "properties" => properties_info,
      "feature_count" => feature_count
    }
  end

  # schemaファイルのパスを取得
  def schema_file_path
    base_path = file_path.gsub(".geojson", "")
    
    # PointとMultiLineStringのschemaファイル位置が異なる
    case data_type
    when "Point"
      "public/data/geoJSON/Point/schema/#{name}.schema.geojson"
    when "MultiLineString"
      "public/data/geoJSON/MultiLineString/schema/#{name}.schema.geojson"
    else
      nil
    end
  end

  # プロパティ名から日本語の説明を生成
  def get_property_description(key)
    descriptions = {
      "parkName" => "公園名",
      "parkType" => "公園種別",
      "areaInService" => "供用面積",
      "stationName" => "駅名",
      "lineName" => "路線名",
      "operatorType" => "運営者種別",
      "railwayCategory" => "鉄道種別",
      "name" => "名称",
      "address" => "住所",
      "capacity" => "収容人数",
      "facilityType" => "施設種別",
      "disasterCategory" => "災害種別",
      "level" => "レベル",
      "height" => "高さ",
      "municipalityName" => "市区町村名",
      "prefectureName" => "都道府県名"
    }
    
    descriptions[key] || key
  end

  # ファイルの存在確認
  def file_exists?
    File.exist?(Rails.root.join("public", file_path))
  end

  # ファイルサイズ取得
  def file_size
    return 0 unless file_exists?
    File.size(Rails.root.join("public", file_path))
  end

  # データ型の表示名
  def data_type_display_name
    case data_type
    when "Point"
      "ポイントデータ"
    when "MultiLineString"
      "ラインデータ"
    when "3DTiles"
      "3Dタイル"
    when "OSM"
      "OSM建物"
    else
      data_type
    end
  end

  # 既存のGeoJSONファイルからデータを読み込む
  def self.load_from_public_files
    # public/data/geoJSON/ から既存のGeoJSONファイルをスキャン
    geojson_dir = Rails.root.join("public", "data", "geoJSON")
    return [] unless Dir.exist?(geojson_dir)

    loaded_data = []

    # Point データ
    point_dir = geojson_dir.join("Point")
    if Dir.exist?(point_dir)
      Dir.glob(point_dir.join("*.geojson")).each do |file_path|
        relative_path = file_path.gsub(Rails.root.join("public").to_s + "/", "")
        name = File.basename(file_path, ".geojson")

        data = find_or_initialize_by(file_path: relative_path)
        data.assign_attributes(
          name: name,
          data_type: "Point",
          visible: true,
          display_order: 0
        )

        if data.save
          loaded_data << data
        end
      end
    end

    # MultiLineString データ
    multiline_dir = geojson_dir.join("MultiLineString")
    if Dir.exist?(multiline_dir)
      Dir.glob(multiline_dir.join("*.geojson")).each do |file_path|
        relative_path = file_path.gsub(Rails.root.join("public").to_s + "/", "")
        name = File.basename(file_path, ".geojson")

        data = find_or_initialize_by(file_path: relative_path)
        data.assign_attributes(
          name: name,
          data_type: "MultiLineString",
          visible: true,
          display_order: 1
        )

        if data.save
          loaded_data << data
        end
      end
    end

    loaded_data
  end

  # 統計情報
  def self.stats
    {
      total: count,
      by_type: group(:data_type).count,
      visible: where(visible: true).count,
      hidden: where(visible: false).count
    }
  end
end
