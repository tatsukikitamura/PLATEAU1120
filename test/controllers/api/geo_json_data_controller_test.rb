require "test_helper"

class Api::GeoJsonDataControllerTest < ActionDispatch::IntegrationTest
  def setup
    @geo_json_data = GeoJsonData.create!(
      name: "テストデータ",
      data_type: "Point",
      file_path: "data/geoJSON/Point/test.geojson",
      visible: true,
      display_order: 1
    )

    # テスト用のGeoJSONファイルを作成
    @test_file_path = Rails.root.join("public", @geo_json_data.file_path)
    FileUtils.mkdir_p(File.dirname(@test_file_path))
    @test_geojson = {
      "type" => "FeatureCollection",
      "features" => [
        {
          "type" => "Feature",
          "geometry" => { "type" => "Point", "coordinates" => [ 139.745433, 35.658581 ] },
          "properties" => { "name" => "Tokyo Station", "type" => "station" }
        },
        {
          "type" => "Feature",
          "geometry" => { "type" => "Point", "coordinates" => [ 139.700258, 35.658581 ] },
          "properties" => { "name" => "Shibuya Station", "type" => "station" }
        }
      ]
    }
    File.write(@test_file_path, @test_geojson.to_json)
  end

  def teardown
    # テストファイルをクリーンアップ
    if @test_file_path && File.exist?(@test_file_path)
      File.delete(@test_file_path)

      # ディレクトリが空の場合のみ削除
      dir_path = File.dirname(@test_file_path)
      if Dir.exist?(dir_path) && Dir.empty?(dir_path)
        FileUtils.rmdir(dir_path)
      end
    end
  end

  test "should get index" do
    get api_geo_json_data_path
    assert_response :success

    response_data = JSON.parse(response.body)
    assert response_data.key?("data")
    assert response_data.key?("meta")
    assert response_data["meta"].key?("total")
    assert response_data["meta"].key?("data_types")
  end

  test "should filter index by data_type" do
    GeoJsonData.create!(
      name: "Line Data",
      data_type: "MultiLineString",
      file_path: "data/geoJSON/MultiLineString/test.geojson",
      visible: true
    )

    get api_geo_json_data_path, params: { data_type: "Point" }
    assert_response :success

    response_data = JSON.parse(response.body)
    assert_equal 1, response_data["data"].count
    assert_equal "テストデータ", response_data["data"].first["name"]
  end

  test "should search index by name" do
    GeoJsonData.create!(
      name: "Another Data",
      data_type: "Point",
      file_path: "data/geoJSON/Point/another.geojson",
      visible: true
    )

    get api_geo_json_data_path, params: { search: "テスト" }
    assert_response :success

    response_data = JSON.parse(response.body)
    assert_equal 1, response_data["data"].count
    assert_equal "テストデータ", response_data["data"].first["name"]
  end


  test "should handle show with not found data" do
    get api_geo_json_datum_path(99999)
    assert_response :not_found

    response_data = JSON.parse(response.body)
    assert_equal "データが見つかりません", response_data["error"]
  end

  test "should apply filter to geo json data" do
    # フィルタ条件を作成
    filter_condition = FilterCondition.create!(
      name: "Station Filter",
      data_type: "Point",
      conditions: { "type_equals" => "station" }.to_json,
      active: true
    )

    post apply_filter_api_geo_json_datum_path(@geo_json_data), params: {
      filter_condition_ids: [ filter_condition.id ]
    }

    # ファイルが存在しない場合は404が返される
    assert_response :not_found
    response_data = JSON.parse(response.body)
    assert_equal "ファイルが見つかりません", response_data["error"]
  end

  test "should apply multiple filters" do
    # 複数のフィルタ条件を作成
    filter1 = FilterCondition.create!(
      name: "Station Filter",
      data_type: "Point",
      conditions: { "type_equals" => "station" }.to_json,
      active: true
    )

    filter2 = FilterCondition.create!(
      name: "Tokyo Filter",
      data_type: "Point",
      conditions: { "name_contains" => "Tokyo" }.to_json,
      active: true
    )

    post apply_filter_api_geo_json_datum_path(@geo_json_data), params: {
      filter_condition_ids: [ filter1.id, filter2.id ]
    }

    # ファイルが存在しない場合は404が返される
    assert_response :not_found
    response_data = JSON.parse(response.body)
    assert_equal "ファイルが見つかりません", response_data["error"]
  end



  test "should get statistics" do
    GeoJsonData.create!(
      name: "Line Data",
      data_type: "MultiLineString",
      file_path: "data/geoJSON/MultiLineString/test.geojson",
      visible: false
    )

    get statistics_api_geo_json_data_path
    assert_response :success

    response_data = JSON.parse(response.body)
    assert response_data.key?("overall")
    assert response_data.key?("by_data_type")

    assert_equal 2, response_data["overall"]["total"]
    assert_equal 1, response_data["overall"]["visible"]
    assert_equal 1, response_data["overall"]["hidden"]

    assert response_data["by_data_type"].key?("Point")
    assert response_data["by_data_type"].key?("MultiLineString")
  end

  test "should handle empty filter condition ids" do
    post apply_filter_api_geo_json_datum_path(@geo_json_data), params: {}

    # ファイルが存在しない場合は404が返される
    assert_response :not_found
    response_data = JSON.parse(response.body)
    assert_equal "ファイルが見つかりません", response_data["error"]
  end
end
