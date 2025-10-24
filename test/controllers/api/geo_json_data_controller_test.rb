require "test_helper"

class Api::GeoJsonDataControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get api_geo_json_data_index_url
    assert_response :success
  end

  test "should get show" do
    get api_geo_json_data_show_url
    assert_response :success
  end

  test "should get apply_filter" do
    get api_geo_json_data_apply_filter_url
    assert_response :success
  end
end
