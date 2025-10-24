class Api::GoogleMapsController < ApplicationController
  before_action :validate_api_key

  # POST /api/google_maps/search_places
  def search_places
    query = params[:query]
    location = params[:location]
    radius = params[:radius]&.to_i || 5000
    type = params[:type]

    if query.blank?
      render json: { error: "検索クエリが必要です" }, status: :bad_request
      return
    end

    service = Api::GoogleMapsGeoJsonService.new

    # 位置情報の処理
    location_param = nil
    if location.present?
      if location.is_a?(Hash) && location[:lat] && location[:lng]
        location_param = { lat: location[:lat].to_f, lng: location[:lng].to_f }
      elsif location.is_a?(String)
        # 住所から座標を取得
        geocode_result = service.geocode(location)
        if geocode_result["features"].present?
          coords = geocode_result["features"].first["geometry"]["coordinates"]
          location_param = { lat: coords[1], lng: coords[0] }
        end
      end
    end

    geojson_data = service.search_places(query, location: location_param, radius: radius, type: type)

    if Rails.env.development?
      # デバッグログを追加
      Rails.logger.info "=== Google Maps API Response Debug ==="
      Rails.logger.info "geojson_data: #{geojson_data.inspect}"
      Rails.logger.info "geojson_data type: #{geojson_data.class}"
      Rails.logger.info "geojson_data['features']: #{geojson_data&.dig('features')&.inspect}"
      Rails.logger.info "geojson_data['features'] type: #{geojson_data&.dig('features')&.class}"
      Rails.logger.info "====================================="
    end

    if geojson_data
      render json: {
        success: true,
        geojson: geojson_data,
        metadata: {
          query: query,
          location: location_param,
          radius: radius,
          type: type,
          feature_count: geojson_data["features"].count
        }
      }
    else
      render json: { error: "Places APIの呼び出しに失敗しました" }, status: :service_unavailable
    end
  end

  # POST /api/google_maps/directions
  def directions
    origin = params[:origin]
    destination = params[:destination]
    mode = params[:mode] || "driving"
    alternatives = params[:alternatives] == "true"

    if origin.blank? || destination.blank?
      render json: { error: "出発地と目的地が必要です" }, status: :bad_request
      return
    end

    service = Api::GoogleMapsGeoJsonService.new
    geojson_data = service.get_directions(origin, destination, mode: mode, alternatives: alternatives)

    if geojson_data
      render json: {
        success: true,
        geojson: geojson_data,
        metadata: {
          origin: origin,
          destination: destination,
          mode: mode,
          alternatives: alternatives,
          route_count: geojson_data["features"].count
        }
      }
    else
      render json: { error: "Directions APIの呼び出しに失敗しました" }, status: :service_unavailable
    end
  end

  # POST /api/google_maps/geocode
  def geocode
    address = params[:address]

    if address.blank?
      render json: { error: "住所が必要です" }, status: :bad_request
      return
    end

    service = Api::GoogleMapsGeoJsonService.new
    geojson_data = service.geocode(address)

    if geojson_data
      render json: {
        success: true,
        geojson: geojson_data,
        metadata: {
          address: address,
          result_count: geojson_data["features"].count
        }
      }
    else
      render json: { error: "Geocoding APIの呼び出しに失敗しました" }, status: :service_unavailable
    end
  end

  private

  def validate_api_key
    if Rails.env.development?
      Rails.logger.info "=== Google Maps API Key Validation ==="
      Rails.logger.info "ENV['GOOGLE_MAPS_API_KEY'] present?: #{ENV['GOOGLE_MAPS_API_KEY'].present?}"
      Rails.logger.info "ENV['GOOGLE_MAPS_API_KEY'] value: #{ENV['GOOGLE_MAPS_API_KEY'].inspect}"
      Rails.logger.info "ENV['GOOGLE_MAPS_API_KEY'] length: #{ENV['GOOGLE_MAPS_API_KEY']&.length}"
      Rails.logger.info "====================================="
    end

    unless ENV["GOOGLE_MAPS_API_KEY"].present?
      Rails.logger.error "Google Maps API key is not set!"
      render json: { error: "Google Maps API keyが設定されていません" }, status: :service_unavailable
    else
      Rails.logger.info "Google Maps API key is properly set" if Rails.env.development?
    end
  end
end
