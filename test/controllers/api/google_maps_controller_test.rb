require "test_helper"

class Api::GoogleMapsControllerTest < ActionDispatch::IntegrationTest
  setup do
    # テスト用のAPIキーを設定
    ENV["GOOGLE_MAPS_API_KEY"] = "test_api_key"
  end

  teardown do
    # テスト後にAPIキーをクリア
    ENV.delete("GOOGLE_MAPS_API_KEY")
  end

  test "should require API key" do
    ENV.delete("GOOGLE_MAPS_API_KEY")

    post api_google_maps_search_places_path, params: { query: "restaurant" }
    assert_response :service_unavailable
    assert_includes response.body, "Google Maps API keyが設定されていません"
  end

  test "should search places with valid parameters" do
    # モックのレスポンスを設定
    mock_response = {
      "results" => [
        {
          "name" => "Test Restaurant",
          "place_id" => "test_place_id",
          "rating" => 4.5,
          "geometry" => {
            "location" => {
              "lat" => 35.658581,
              "lng" => 139.745433
            }
          },
          "vicinity" => "Test Area",
          "types" => [ "restaurant", "food" ]
        }
      ]
    }

    # GoogleMapsGeoJsonServiceをモック
    service_mock = Minitest::Mock.new
    service_mock.expect :search_places, {
      "type" => "FeatureCollection",
      "features" => [
        {
          "type" => "Feature",
          "geometry" => {
            "type" => "Point",
            "coordinates" => [ 139.745433, 35.658581 ]
          },
          "properties" => {
            "name" => "Test Restaurant",
            "place_id" => "test_place_id",
            "rating" => 4.5
          }
        }
      ]
    }, [ String, Hash ]

    GoogleMapsGeoJsonService.stub :new, service_mock do
      post api_google_maps_search_places_path, params: {
        query: "restaurant",
        location: { lat: 35.6, lng: 139.7 },
        radius: 1000
      }

      assert_response :success
      response_data = JSON.parse(response.body)
      assert response_data["success"]
      assert_equal "FeatureCollection", response_data["geojson"]["type"]
      assert_equal 1, response_data["geojson"]["features"].count
    end
  end

  test "should require query parameter for places search" do
    post api_google_maps_search_places_path, params: {}
    assert_response :bad_request
    assert_includes response.body, "検索クエリが必要です"
  end

  test "should get directions with valid parameters" do
    # GoogleMapsGeoJsonServiceをモック
    service_mock = Minitest::Mock.new
    service_mock.expect :get_directions, {
      "type" => "FeatureCollection",
      "features" => [
        {
          "type" => "Feature",
          "geometry" => {
            "type" => "LineString",
            "coordinates" => [ [ 139.7, 35.6 ], [ 139.8, 35.7 ] ]
          },
          "properties" => {
            "route_index" => 0,
            "summary" => "Test Route"
          }
        }
      ]
    }, [ String, String, Hash ]

    GoogleMapsGeoJsonService.stub :new, service_mock do
      post api_google_maps_directions_path, params: {
        origin: "Tokyo Station",
        destination: "Shibuya Station",
        mode: "driving"
      }

      assert_response :success
      response_data = JSON.parse(response.body)
      assert response_data["success"]
      assert_equal "FeatureCollection", response_data["geojson"]["type"]
      assert_equal 1, response_data["geojson"]["features"].count
    end
  end

  test "should require origin and destination for directions" do
    post api_google_maps_directions_path, params: { origin: "Tokyo" }
    assert_response :bad_request
    assert_includes response.body, "出発地と目的地が必要です"
  end

  test "should geocode address" do
    # GoogleMapsGeoJsonServiceをモック
    service_mock = Minitest::Mock.new
    service_mock.expect :geocode, {
      "type" => "FeatureCollection",
      "features" => [
        {
          "type" => "Feature",
          "geometry" => {
            "type" => "Point",
            "coordinates" => [ 139.745433, 35.658581 ]
          },
          "properties" => {
            "formatted_address" => "Tokyo, Japan",
            "place_id" => "test_place_id"
          }
        }
      ]
    }, [ String ]

    GoogleMapsGeoJsonService.stub :new, service_mock do
      post api_google_maps_geocode_path, params: {
        address: "Tokyo, Japan"
      }

      assert_response :success
      response_data = JSON.parse(response.body)
      assert response_data["success"]
      assert_equal "FeatureCollection", response_data["geojson"]["type"]
      assert_equal 1, response_data["geojson"]["features"].count
    end
  end

  test "should require address for geocoding" do
    post api_google_maps_geocode_path, params: {}
    assert_response :bad_request
    assert_includes response.body, "住所が必要です"
  end

  test "should handle service errors gracefully" do
    # サービスがnilを返す場合のテスト
    service_mock = Minitest::Mock.new
    service_mock.expect :search_places, nil, [ String, Hash ]

    GoogleMapsGeoJsonService.stub :new, service_mock do
      post api_google_maps_search_places_path, params: { query: "restaurant" }
      assert_response :service_unavailable
      assert_includes response.body, "Places APIの呼び出しに失敗しました"
    end
  end
end
