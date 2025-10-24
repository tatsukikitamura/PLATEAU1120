require "test_helper"

class Api::FilterConditionsControllerTest < ActionDispatch::IntegrationTest
  test "should get create" do
    get api_filter_conditions_create_url
    assert_response :success
  end

  test "should get update" do
    get api_filter_conditions_update_url
    assert_response :success
  end

  test "should get destroy" do
    get api_filter_conditions_destroy_url
    assert_response :success
  end
end
