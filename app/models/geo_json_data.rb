class GeoJsonData < ApplicationRecord
  # バリデーション
  validates :name, presence: true, uniqueness: true
  validates :data_type, presence: true
  validates :file_path, presence: true
  validates :visible, inclusion: { in: [true, false] }
  
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
  
  # ファイルの存在確認
  def file_exists?
    File.exist?(Rails.root.join('public', file_path))
  end
  
  # ファイルサイズ取得
  def file_size
    return 0 unless file_exists?
    File.size(Rails.root.join('public', file_path))
  end
  
  # データ型の表示名
  def data_type_display_name
    case data_type
    when 'Point'
      'ポイントデータ'
    when 'MultiLineString'
      'ラインデータ'
    when '3DTiles'
      '3Dタイル'
    when 'OSM'
      'OSM建物'
    else
      data_type
    end
  end
  
  # 既存のGeoJSONファイルからデータを読み込む
  def self.load_from_public_files
    # public/data/geoJSON/ から既存のGeoJSONファイルをスキャン
    geojson_dir = Rails.root.join('public', 'data', 'geoJSON')
    return [] unless Dir.exist?(geojson_dir)
    
    loaded_data = []
    
    # Point データ
    point_dir = geojson_dir.join('Point')
    if Dir.exist?(point_dir)
      Dir.glob(point_dir.join('*.geojson')).each do |file_path|
        relative_path = file_path.gsub(Rails.root.join('public').to_s + '/', '')
        name = File.basename(file_path, '.geojson')
        
        data = find_or_initialize_by(file_path: relative_path)
        data.assign_attributes(
          name: name,
          data_type: 'Point',
          visible: true,
          display_order: 0
        )
        
        if data.save
          loaded_data << data
        end
      end
    end
    
    # MultiLineString データ
    multiline_dir = geojson_dir.join('MultiLineString')
    if Dir.exist?(multiline_dir)
      Dir.glob(multiline_dir.join('*.geojson')).each do |file_path|
        relative_path = file_path.gsub(Rails.root.join('public').to_s + '/', '')
        name = File.basename(file_path, '.geojson')
        
        data = find_or_initialize_by(file_path: relative_path)
        data.assign_attributes(
          name: name,
          data_type: 'MultiLineString',
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
