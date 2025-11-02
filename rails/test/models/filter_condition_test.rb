require "test_helper"

class FilterConditionTest < ActiveSupport::TestCase
  def setup
    @filter_condition = FilterCondition.new(
      name: "テストフィルタ",
      data_type: "Point",
      conditions: { "type_equals" => "landmark" },
      active: true,
      priority: 1
    )
  end

  test "should be valid with valid attributes" do
    assert @filter_condition.valid?
  end

  test "should require name" do
    @filter_condition.name = nil
    assert_not @filter_condition.valid?
    assert_includes @filter_condition.errors[:name], "can't be blank"
  end

  test "should require conditions" do
    @filter_condition.conditions = nil
    assert_not @filter_condition.valid?
    assert_includes @filter_condition.errors[:conditions], "can't be blank"
  end

  test "should validate data_type inclusion" do
    @filter_condition.data_type = "InvalidType"
    assert_not @filter_condition.valid?
    assert_includes @filter_condition.errors[:data_type], "is not included in the list"
  end

  test "should allow blank data_type" do
    @filter_condition.data_type = ""
    assert @filter_condition.valid?
  end

  test "should parse conditions hash correctly" do
    conditions_json = { "type_equals" => "landmark", "name_contains" => "park" }.to_json
    @filter_condition.conditions = conditions_json

    expected_hash = { "type_equals" => "landmark", "name_contains" => "park" }
    assert_equal expected_hash, @filter_condition.conditions_hash
  end

  test "should handle invalid JSON in conditions" do
    @filter_condition.conditions = "invalid json"
    assert_equal({}, @filter_condition.conditions_hash)
  end

  test "should set conditions hash correctly" do
    hash = { "type_equals" => "station" }
    @filter_condition.conditions_hash = hash
    assert_equal hash.to_json, @filter_condition.conditions
  end

  test "should apply name_contains filter correctly" do
    geojson_data = [
      { "properties" => { "name" => "Tokyo Station" } },
      { "properties" => { "name" => "Shibuya Station" } },
      { "properties" => { "name" => "Tokyo Park" } }
    ]

    @filter_condition.conditions_hash = { "name_contains" => "Station" }
    filtered = @filter_condition.apply_to_geojson(geojson_data)

    assert_equal 2, filtered.count
    assert_includes filtered.map { |f| f["properties"]["name"] }, "Tokyo Station"
    assert_includes filtered.map { |f| f["properties"]["name"] }, "Shibuya Station"
  end

  test "should apply type_equals filter correctly" do
    geojson_data = [
      { "properties" => { "type" => "landmark" } },
      { "properties" => { "type" => "station" } },
      { "properties" => { "type" => "landmark" } }
    ]

    @filter_condition.conditions_hash = { "type_equals" => "landmark" }
    filtered = @filter_condition.apply_to_geojson(geojson_data)

    assert_equal 2, filtered.count
    assert filtered.all? { |f| f["properties"]["type"] == "landmark" }
  end

  test "should apply category_equals filter correctly" do
    geojson_data = [
      { "properties" => { "category" => "transport" } },
      { "properties" => { "category" => "leisure" } },
      { "properties" => { "category" => "transport" } }
    ]

    @filter_condition.conditions_hash = { "category_equals" => "transport" }
    filtered = @filter_condition.apply_to_geojson(geojson_data)

    assert_equal 2, filtered.count
    assert filtered.all? { |f| f["properties"]["category"] == "transport" }
  end

  test "should return original data when conditions are blank" do
    geojson_data = [ { "properties" => { "name" => "test" } } ]
    @filter_condition.conditions_hash = {}

    assert_equal geojson_data, @filter_condition.apply_to_geojson(geojson_data)
  end

  test "should generate correct description" do
    @filter_condition.conditions_hash = { "name_contains" => "park" }
    assert_equal "名前に「park」を含む", @filter_condition.description
  end

  test "should generate combined description" do
    @filter_condition.conditions_hash = {
      "name_contains" => "park",
      "type_equals" => "landmark"
    }
    assert_equal "名前に「park」を含む かつ タイプが「landmark」", @filter_condition.description
  end

  test "should return default description for blank conditions" do
    @filter_condition.conditions_hash = {}
    assert_equal "条件なし", @filter_condition.description
  end

  test "should create default filters" do
    created_filters = FilterCondition.create_default_filters

    assert_equal 4, created_filters.count
    assert created_filters.any? { |f| f.name == "ランドマークのみ" }
    assert created_filters.any? { |f| f.name == "公園のみ" }
    assert created_filters.any? { |f| f.name == "避難所のみ" }
    assert created_filters.any? { |f| f.name == "駅のみ" }
  end

  test "should not create duplicate default filters" do
    # 最初にデフォルトフィルタを作成
    FilterCondition.create_default_filters

    # 再度作成しても重複しない
    created_filters = FilterCondition.create_default_filters
    assert_equal 4, created_filters.count
  end

  test "should return correct stats" do
    FilterCondition.create_default_filters

    stats = FilterCondition.stats
    assert stats.key?(:total)
    assert stats.key?(:active)
    assert stats.key?(:by_data_type)
    assert stats.key?(:by_user)
    assert_equal 4, stats[:total]
    assert_equal 4, stats[:active]
  end

  test "active scope should return only active filters" do
    FilterCondition.create!(name: "Active Filter", conditions: "{}", active: true)
    FilterCondition.create!(name: "Inactive Filter", conditions: "{}", active: false)

    active_filters = FilterCondition.active
    assert_equal 1, active_filters.count
    assert_equal "Active Filter", active_filters.first.name
  end

  test "by_data_type scope should filter by data type" do
    FilterCondition.create!(name: "Point Filter", data_type: "Point", conditions: "{}")
    FilterCondition.create!(name: "Line Filter", data_type: "MultiLineString", conditions: "{}")

    point_filters = FilterCondition.by_data_type("Point")
    assert_equal 1, point_filters.count
    assert_equal "Point Filter", point_filters.first.name
  end

  test "ordered scope should order by priority and name" do
    FilterCondition.create!(name: "Z Filter", priority: 2, conditions: "{}")
    FilterCondition.create!(name: "A Filter", priority: 1, conditions: "{}")
    FilterCondition.create!(name: "B Filter", priority: 1, conditions: "{}")

    ordered_filters = FilterCondition.ordered
    assert_equal "A Filter", ordered_filters.first.name
    assert_equal "B Filter", ordered_filters.second.name
    assert_equal "Z Filter", ordered_filters.third.name
  end
end
