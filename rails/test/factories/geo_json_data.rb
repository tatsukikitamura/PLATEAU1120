# test/factories/geo_json_data.rb
FactoryBot.define do
  factory :geo_json_data do
    name { "テストデータ" }
    data_type { "Point" }
    file_path { "data/geoJSON/Point/test.geojson" }
    visible { true }
    display_order { 1 }
    properties_json { { "source" => "test", "version" => "1.0" }.to_json }
    metadata { { "created_at" => Time.current.iso8601, "updated_at" => Time.current.iso8601 }.to_json }

    trait :hidden do
      visible { false }
    end

    trait :line_data do
      name { "ラインデータ" }
      data_type { "MultiLineString" }
      file_path { "data/geoJSON/MultiLineString/test.geojson" }
      display_order { 2 }
    end

    trait :tiles_data do
      name { "3Dタイルデータ" }
      data_type { "3DTiles" }
      file_path { "data/tileset/building_lod2/tileset.json" }
      display_order { 3 }
    end

    trait :osm_data do
      name { "OSM建物データ" }
      data_type { "OSM" }
      file_path { "data/osm/buildings.geojson" }
      display_order { 4 }
    end

    trait :with_properties do
      properties_json { { "name" => "Test Place", "type" => "landmark", "category" => "tourism" }.to_json }
    end

    trait :with_metadata do
      metadata { { "source" => "OpenStreetMap", "license" => "ODbL", "last_updated" => "2024-01-01" }.to_json }
    end

    trait :high_priority do
      display_order { 0 }
    end

    trait :low_priority do
      display_order { 999 }
    end

    # 実際のファイルを作成するtrait
    trait :with_file do
      after(:create) do |geo_json_data|
        # テスト用のGeoJSONファイルを作成
        file_path = Rails.root.join("public", geo_json_data.file_path)
        FileUtils.mkdir_p(File.dirname(file_path))

        sample_geojson = {
          "type" => "FeatureCollection",
          "features" => [
            {
              "type" => "Feature",
              "geometry" => { "type" => "Point", "coordinates" => [ 139.745433, 35.658581 ] },
              "properties" => { "name" => "Test Place", "type" => "landmark" }
            }
          ]
        }

        File.write(file_path, sample_geojson.to_json)
      end
    end

    # 複数のフィーチャーを持つファイル
    trait :with_multiple_features do
      after(:create) do |geo_json_data|
        file_path = Rails.root.join("public", geo_json_data.file_path)
        FileUtils.mkdir_p(File.dirname(file_path))

        sample_geojson = {
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
              "properties" => { "name" => "Shibuya Park", "type" => "park" }
            },
            {
              "type" => "Feature",
              "geometry" => { "type" => "Point", "coordinates" => [ 139.691706, 35.689487 ] },
              "properties" => { "name" => "Tokyo Tower", "type" => "landmark" }
            }
          ]
        }

        File.write(file_path, sample_geojson.to_json)
      end
    end
  end
end
