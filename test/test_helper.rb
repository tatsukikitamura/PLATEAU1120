ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"
require "webmock/minitest"
require "factory_bot_rails"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Include FactoryBot methods
    include FactoryBot::Syntax::Methods

    # Add more helper methods to be used by all tests here...
    
    # テスト用のGeoJSONファイルを作成するヘルパー
    def create_test_geojson_file(file_path, geojson_data)
      full_path = Rails.root.join("public", file_path)
      FileUtils.mkdir_p(File.dirname(full_path))
      File.write(full_path, geojson_data.to_json)
      full_path
    end

    # テスト用のGeoJSONファイルを削除するヘルパー
    def cleanup_test_geojson_file(file_path)
      full_path = Rails.root.join("public", file_path)
      File.delete(full_path) if File.exist?(full_path)
      
      # ディレクトリが空の場合のみ削除
      dir_path = File.dirname(full_path)
      if Dir.exist?(dir_path) && Dir.empty?(dir_path)
        FileUtils.rmdir(dir_path)
      end
    end

    # テスト用のサンプルGeoJSONデータを生成
    def sample_geojson_data
      {
        "type" => "FeatureCollection",
        "features" => [
          {
            "type" => "Feature",
            "geometry" => { "type" => "Point", "coordinates" => [139.745433, 35.658581] },
            "properties" => { "name" => "Tokyo Station", "type" => "station", "category" => "transport" }
          },
          {
            "type" => "Feature",
            "geometry" => { "type" => "Point", "coordinates" => [139.700258, 35.658581] },
            "properties" => { "name" => "Shibuya Park", "type" => "park", "category" => "leisure" }
          },
          {
            "type" => "Feature",
            "geometry" => { "type" => "Point", "coordinates" => [139.691706, 35.689487] },
            "properties" => { "name" => "Tokyo Tower", "type" => "landmark", "category" => "tourism" }
          }
        ]
      }
    end

    # テスト用のフィルタ条件を作成
    def create_test_filter_condition(attributes = {})
      default_attributes = {
        name: "テストフィルタ",
        data_type: "Point",
        conditions: { "type_equals" => "landmark" }.to_json,
        active: true,
        priority: 1
      }
      FilterCondition.create!(default_attributes.merge(attributes))
    end

    # テスト用のGeoJSONデータを作成
    def create_test_geo_json_data(attributes = {})
      default_attributes = {
        name: "テストデータ",
        data_type: "Point",
        file_path: "data/geoJSON/Point/test.geojson",
        visible: true,
        display_order: 1
      }
      GeoJsonData.create!(default_attributes.merge(attributes))
    end

    # APIレスポンスのJSONをパースして検証
    def assert_json_response(expected_keys = [])
      assert_response :success
      response_data = JSON.parse(response.body)
      
      expected_keys.each do |key|
        assert response_data.key?(key), "Expected response to include '#{key}'"
      end
      
      response_data
    end

    # エラーレスポンスのJSONをパースして検証
    def assert_json_error_response(expected_status = :unprocessable_entity)
      assert_response expected_status
      response_data = JSON.parse(response.body)
      assert response_data.key?("errors") || response_data.key?("error")
      response_data
    end

    # Google Maps APIのモックレスポンスを設定
    def setup_google_maps_mock(endpoint, response_data, status = 200)
      case endpoint
      when :places
        stub_request(:get, /maps\.googleapis\.com\/maps\/api\/place\/textsearch\/json/)
          .to_return(status: status, body: response_data.to_json)
      when :directions
        stub_request(:get, /maps\.googleapis\.com\/maps\/api\/directions\/json/)
          .to_return(status: status, body: response_data.to_json)
      when :geocode
        stub_request(:get, /maps\.googleapis\.com\/maps\/api\/geocode\/json/)
          .to_return(status: status, body: response_data.to_json)
      end
    end

    # テスト用のGoogle Maps APIキーを設定
    def setup_google_maps_api_key
      ENV["GOOGLE_MAPS_API_KEY"] = "test_api_key"
    end

    # Google Maps APIキーをクリア
    def clear_google_maps_api_key
      ENV.delete("GOOGLE_MAPS_API_KEY")
    end
  end
end
