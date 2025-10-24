class FilterCondition < ApplicationRecord
  # バリデーション
  validates :name, presence: true
  validates :conditions, presence: true
  validates :data_type, inclusion: { in: GeoJsonData::DATA_TYPES, allow_blank: true }
  
  # スコープ
  scope :active, -> { where(active: true) }
  scope :by_data_type, ->(type) { where(data_type: type) }
  scope :by_user, ->(user_id) { where(user_id: user_id) }
  scope :ordered, -> { order(:priority, :name) }
  
  # 条件のJSONパース
  def conditions_hash
    return {} if conditions.blank?
    JSON.parse(conditions)
  rescue JSON::ParserError
    {}
  end
  
  def conditions_hash=(hash)
    self.conditions = hash.to_json
  end
  
  # 条件の適用
  def apply_to_geojson(geojson_data)
    return geojson_data if conditions_hash.blank?
    
    # フィルタ条件に基づいてGeoJSONデータをフィルタリング
    conditions_hash.each do |property, value|
      case property
      when 'name_contains'
        geojson_data = geojson_data.select { |item| 
          item['properties'] && item['properties']['name']&.include?(value)
        }
      when 'type_equals'
        geojson_data = geojson_data.select { |item| 
          item['properties'] && item['properties']['type'] == value
        }
      when 'category_equals'
        geojson_data = geojson_data.select { |item| 
          item['properties'] && item['properties']['category'] == value
        }
      end
    end
    
    geojson_data
  end
  
  # 条件の説明文を生成
  def description
    conditions = conditions_hash
    return '条件なし' if conditions.blank?
    
    descriptions = []
    conditions.each do |key, value|
      case key
      when 'name_contains'
        descriptions << "名前に「#{value}」を含む"
      when 'type_equals'
        descriptions << "タイプが「#{value}」"
      when 'category_equals'
        descriptions << "カテゴリが「#{value}」"
      end
    end
    
    descriptions.join(' かつ ')
  end
  
  # デフォルトフィルタの作成
  def self.create_default_filters
    default_filters = [
      {
        name: 'ランドマークのみ',
        data_type: 'Point',
        conditions: { 'type_equals' => 'landmark' },
        active: true,
        priority: 1
      },
      {
        name: '公園のみ',
        data_type: 'Point',
        conditions: { 'type_equals' => 'park' },
        active: true,
        priority: 2
      },
      {
        name: '避難所のみ',
        data_type: 'Point',
        conditions: { 'type_equals' => 'shelter' },
        active: true,
        priority: 3
      },
      {
        name: '駅のみ',
        data_type: 'Point',
        conditions: { 'type_equals' => 'station' },
        active: true,
        priority: 4
      }
    ]
    
    created_filters = []
    default_filters.each do |filter_data|
      filter = find_or_initialize_by(name: filter_data[:name])
      filter.assign_attributes(filter_data)
      if filter.save
        created_filters << filter
      end
    end
    
    created_filters
  end
  
  # 統計情報
  def self.stats
    {
      total: count,
      active: where(active: true).count,
      by_data_type: group(:data_type).count,
      by_user: group(:user_id).count
    }
  end
end
