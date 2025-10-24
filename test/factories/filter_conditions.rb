# test/factories/filter_conditions.rb
FactoryBot.define do
  factory :filter_condition do
    name { "テストフィルタ" }
    data_type { "Point" }
    conditions { { "type_equals" => "landmark" }.to_json }
    active { true }
    priority { 1 }
    user_id { nil }

    trait :inactive do
      active { false }
    end

    trait :for_line_data do
      data_type { "MultiLineString" }
      conditions { { "name_contains" => "road" }.to_json }
    end

    trait :for_3d_tiles do
      data_type { "3DTiles" }
      conditions { { "category_equals" => "building" }.to_json }
    end

    trait :with_multiple_conditions do
      conditions { { "type_equals" => "station", "name_contains" => "Tokyo" }.to_json }
    end

    trait :default_landmark do
      name { "ランドマークのみ" }
      conditions { { "type_equals" => "landmark" }.to_json }
      priority { 1 }
    end

    trait :default_park do
      name { "公園のみ" }
      conditions { { "type_equals" => "park" }.to_json }
      priority { 2 }
    end

    trait :default_shelter do
      name { "避難所のみ" }
      conditions { { "type_equals" => "shelter" }.to_json }
      priority { 3 }
    end

    trait :default_station do
      name { "駅のみ" }
      conditions { { "type_equals" => "station" }.to_json }
      priority { 4 }
    end
  end
end
