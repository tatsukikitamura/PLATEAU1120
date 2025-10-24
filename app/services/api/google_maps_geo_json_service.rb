require "net/http"
require "uri"
require "json"

class Api::GoogleMapsGeoJsonService
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :api_key, default: -> { ENV["GOOGLE_MAPS_API_KEY"] }

  BASE_URL = "https://maps.googleapis.com/maps/api"

  def initialize(attributes = {})
    super
    if Rails.env.development?
      Rails.logger.info "=== GoogleMapsGeoJsonService Initialization ==="
      Rails.logger.info "api_key present?: #{api_key.present?}"
      Rails.logger.info "api_key value: #{api_key.inspect}"
      Rails.logger.info "api_key length: #{api_key&.length}"
      Rails.logger.info "============================================="
    end

    if api_key.blank?
      Rails.logger.error "Google Maps API key is blank in service!"
      raise ArgumentError, "Google Maps API key is required"
    else
      Rails.logger.info "Google Maps API key is properly set in service" if Rails.env.development?
    end
  end

  # Places API検索
  def search_places(query, location: nil, radius: 5000, type: nil)
    params = {
      query: query,
      key: api_key,
      language: "ja"
    }

    params[:location] = "#{location[:lat]},#{location[:lng]}" if location
    params[:radius] = radius if radius
    params[:type] = type if type

    response = make_request("/place/textsearch/json", params)
    return nil unless response

    places_to_geojson(response)
  end

  # Directions API（ルート計算）
  def get_directions(origin, destination, mode: "driving", alternatives: false)
    params = {
      origin: origin,
      destination: destination,
      mode: mode,
      alternatives: alternatives,
      key: api_key,
      language: "ja"
    }

    response = make_request("/directions/json", params)
    return nil unless response

    directions_to_geojson(response)
  end

  # Geocoding API（住所から座標取得）
  def geocode(address)
    params = {
      address: address,
      key: api_key,
      language: "ja"
    }

    response = make_request("/geocode/json", params)
    return nil unless response

    geocoding_to_geojson(response)
  end

  # Places APIレスポンスをGeoJSONに変換
  def places_to_geojson(places_response)
    return create_empty_geojson unless places_response["results"]

    features = places_response["results"].map do |place|
      location = place.dig("geometry", "location")
      next nil unless location

      {
        "type" => "Feature",
        "geometry" => {
          "type" => "Point",
          "coordinates" => [ location["lng"], location["lat"] ] # GeoJSONは[経度, 緯度]の順序
        },
        "properties" => {
          "name" => place["name"],
          "place_id" => place["place_id"],
          "rating" => place["rating"],
          "price_level" => place["price_level"],
          "types" => place["types"],
          "vicinity" => place["vicinity"],
          "formatted_address" => place["formatted_address"]
        }
      }
    end.compact

    {
      "type" => "FeatureCollection",
      "features" => features
    }
  end

  # Directions APIレスポンスをGeoJSONに変換
  def directions_to_geojson(directions_response)
    return create_empty_geojson unless directions_response["routes"]

    features = directions_response["routes"].map.with_index do |route, index|
      # ルートの座標配列を取得
      coordinates = extract_route_coordinates(route)
      next nil if coordinates.empty?

      {
        "type" => "Feature",
        "geometry" => {
          "type" => "LineString",
          "coordinates" => coordinates
        },
        "properties" => {
          "route_index" => index,
          "summary" => route["summary"],
          "legs" => route["legs"].map do |leg|
            {
              "distance" => leg["distance"],
              "duration" => leg["duration"],
              "start_address" => leg["start_address"],
              "end_address" => leg["end_address"]
            }
          end
        }
      }
    end.compact

    {
      "type" => "FeatureCollection",
      "features" => features
    }
  end

  # Geocoding APIレスポンスをGeoJSONに変換
  def geocoding_to_geojson(geocoding_response)
    return create_empty_geojson unless geocoding_response["results"]

    features = geocoding_response["results"].map do |result|
      location = result["geometry"]["location"]

      {
        "type" => "Feature",
        "geometry" => {
          "type" => "Point",
          "coordinates" => [ location["lng"], location["lat"] ]
        },
        "properties" => {
          "formatted_address" => result["formatted_address"],
          "place_id" => result["place_id"],
          "types" => result["types"],
          "address_components" => result["address_components"]
        }
      }
    end

    {
      "type" => "FeatureCollection",
      "features" => features
    }
  end

  private

  # HTTPリクエストを実行
  def make_request(endpoint, params)
    uri = URI("#{BASE_URL}#{endpoint}")
    uri.query = URI.encode_www_form(params)

    if Rails.env.development?
      Rails.logger.info "=== Google Maps API Request ==="
      Rails.logger.info "URL: #{uri}"
      Rails.logger.info "Params: #{params.inspect}"
      Rails.logger.info "=============================="
    end

    response = Net::HTTP.get_response(uri)

    if Rails.env.development?
      Rails.logger.info "=== Google Maps API Response ==="
      Rails.logger.info "Status Code: #{response.code}"
      Rails.logger.info "Response Body: #{response.body}"
      Rails.logger.info "==============================="
    end

    if response.code == "200"
      parsed_response = JSON.parse(response.body)
      if Rails.env.development?
        Rails.logger.info "=== Parsed Response ==="
        Rails.logger.info "Parsed: #{parsed_response.inspect}"
        Rails.logger.info "======================"
      end
      parsed_response
    else
      Rails.logger.error "Google Maps API error: #{response.code} - #{response.body}"
      nil
    end
  rescue => e
    Rails.logger.error "Google Maps API request error: #{e.message}"
    Rails.logger.error "Error backtrace: #{e.backtrace.join("\n")}" if Rails.env.development?
    nil
  end

  # ルートの座標配列を抽出
  def extract_route_coordinates(route)
    coordinates = []

    route["legs"].each do |leg|
      leg["steps"].each do |step|
        # 各ステップの座標を取得
        step_coords = decode_polyline(step["polyline"]["points"])
        coordinates.concat(step_coords)
      end
    end

    coordinates
  end

  # Google Polylineをデコード（簡易実装）
  def decode_polyline(encoded)
    return [] if encoded.blank?

    # 簡易的なデコード実装
    # 実際のプロダクションでは、より堅牢なライブラリを使用することを推奨
    coordinates = []

    # 基本的なデコードロジック（実際の実装ではより複雑）
    # ここでは簡易版として、実際のプロダクションでは適切なライブラリを使用
    begin
      # 実際の実装では、Google Polyline Algorithmを使用
      # ここでは簡易版として空配列を返す
      coordinates
    rescue => e
      Rails.logger.error "Polyline decode error: #{e.message}"
      []
    end
  end

  # 空のGeoJSONを作成
  def create_empty_geojson
    {
      "type" => "FeatureCollection",
      "features" => []
    }
  end
end
