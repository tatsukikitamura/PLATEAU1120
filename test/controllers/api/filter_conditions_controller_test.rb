require "test_helper"

class Api::FilterConditionsControllerTest < ActionDispatch::IntegrationTest
  def setup
    @filter_condition = FilterCondition.create!(
      name: "テストフィルタ",
      data_type: "Point",
      conditions: { "type_equals" => "landmark" }.to_json,
      active: true,
      priority: 1
    )
  end

  test "should get index" do
    get api_filter_conditions_path
    assert_response :success

    response_data = JSON.parse(response.body)
    assert response_data.key?("data")
    assert response_data.key?("meta")
    assert response_data["meta"].key?("total")
    assert response_data["meta"].key?("data_types")
  end

  test "should filter index by data_type" do
    FilterCondition.create!(
      name: "Line Filter",
      data_type: "MultiLineString",
      conditions: "{}",
      active: true
    )

    get api_filter_conditions_path, params: { data_type: "Point" }
    assert_response :success

    response_data = JSON.parse(response.body)
    assert_equal 1, response_data["data"].count
    assert_equal "テストフィルタ", response_data["data"].first["name"]
  end

  test "should create filter condition with valid parameters" do
    assert_difference("FilterCondition.count") do
      post api_filter_conditions_path, params: {
        filter_condition: {
          name: "新しいフィルタ",
          data_type: "Point",
          conditions: { "name_contains" => "park" },
          active: true,
          priority: 2
        }
      }
    end

    assert_response :created
    response_data = JSON.parse(response.body)
    assert response_data.key?("data")
    assert_equal "フィルタ条件が作成されました", response_data["message"]
  end

  test "should not create filter condition with invalid parameters" do
    assert_no_difference("FilterCondition.count") do
      post api_filter_conditions_path, params: {
        filter_condition: {
          name: "",
          data_type: "InvalidType",
          conditions: nil
        }
      }
    end

    assert_response :unprocessable_entity
    response_data = JSON.parse(response.body)
    assert response_data.key?("errors")
    assert_equal "フィルタ条件の作成に失敗しました", response_data["message"]
  end

  test "should update filter condition with valid parameters" do
    patch api_filter_condition_path(@filter_condition), params: {
      filter_condition: {
        name: "更新されたフィルタ",
        active: false
      }
    }

    assert_response :success
    response_data = JSON.parse(response.body)
    assert_equal "更新されたフィルタ", response_data["data"]["name"]
    assert_equal "フィルタ条件が更新されました", response_data["message"]

    @filter_condition.reload
    assert_equal "更新されたフィルタ", @filter_condition.name
    assert_not @filter_condition.active
  end

  test "should not update filter condition with invalid parameters" do
    patch api_filter_condition_path(@filter_condition), params: {
      filter_condition: {
        name: "",
        data_type: "InvalidType"
      }
    }

    assert_response :unprocessable_entity
    response_data = JSON.parse(response.body)
    assert response_data.key?("errors")
    assert_equal "フィルタ条件の更新に失敗しました", response_data["message"]
  end

  test "should destroy filter condition" do
    assert_difference("FilterCondition.count", -1) do
      delete api_filter_condition_path(@filter_condition)
    end

    assert_response :success
    response_data = JSON.parse(response.body)
    assert_equal "フィルタ条件が削除されました", response_data["message"]
  end

  test "should toggle filter condition active status" do
    post toggle_api_filter_condition_path(@filter_condition)

    assert_response :success
    response_data = JSON.parse(response.body)
    assert response_data.key?("data")
    assert_equal "フィルタ条件が無効になりました", response_data["message"]

    @filter_condition.reload
    assert_not @filter_condition.active

    # 再度トグル
    post toggle_api_filter_condition_path(@filter_condition)
    assert_response :success

    @filter_condition.reload
    assert @filter_condition.active
  end

  test "should reset default filters" do
    # 既存のデフォルトフィルタを削除
    FilterCondition.where(name: [ "ランドマークのみ", "公園のみ", "避難所のみ", "駅のみ" ]).destroy_all

    post reset_defaults_api_filter_conditions_path

    assert_response :success
    response_data = JSON.parse(response.body)
    assert_equal 4, response_data["data"].count
    assert_equal "4件のデフォルトフィルタが作成されました", response_data["message"]

    # 作成されたフィルタを確認
    created_names = response_data["data"].map { |f| f["name"] }
    assert_includes created_names, "ランドマークのみ"
    assert_includes created_names, "公園のみ"
    assert_includes created_names, "避難所のみ"
    assert_includes created_names, "駅のみ"
  end

  test "should handle not found for update" do
    patch api_filter_condition_path(99999), params: {
      filter_condition: { name: "存在しないフィルタ" }
    }

    assert_response :not_found
  end

  test "should handle not found for destroy" do
    delete api_filter_condition_path(99999)

    assert_response :not_found
  end

  test "should handle not found for toggle" do
    post toggle_api_filter_condition_path(99999)

    assert_response :not_found
    response_data = JSON.parse(response.body)
    assert_equal "フィルタ条件が見つかりません", response_data["error"]
  end
end
