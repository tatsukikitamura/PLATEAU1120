class Api::GoogleMapsController < ApplicationController
  include ApiResponseHelper
  include FastApiClient

  # POST /api/google_maps/search_places
  def search_places
    if params[:query].blank?
      render json: {
        success: false,
        error: "検索クエリが必要です"
      }, status: :bad_request
      return
    end

    query = params[:query]
    location = params[:location]
    radius = params[:radius]&.to_i || 5000
    type = params[:type]

    # 位置情報の処理
    location_param = nil
    if location.present?
      if location.is_a?(Hash) && location[:lat] && location[:lng]
        location_param = { lat: location[:lat].to_f, lng: location[:lng].to_f }
      elsif location.is_a?(String)
        # 住所から座標を取得（FastAPI経由）
        geocode_response = make_request(
          "POST",
          "/api/google-maps/geocode",
          { address: location }
        )
        if geocode_response && geocode_response["success"] && geocode_response["geojson"]["features"].present?
          coords = geocode_response["geojson"]["features"].first["geometry"]["coordinates"]
          location_param = { lat: coords[1], lng: coords[0] }
        end
      end
    end

    # FastAPI経由でPlaces APIを呼び出し
    request_body = {
      query: query,
      radius: radius
    }
    request_body[:location] = location_param if location_param
    request_body[:type] = type if type

    response = make_request(
      "POST",
      "/api/google-maps/search-places",
      request_body
    )

    if response && response["success"]
      render json: {
        success: true,
        geojson: response["geojson"],
        metadata: response["metadata"]
      }, status: :ok
    else
      render json: {
        success: false,
        error: response&.dig("error") || "Places APIの呼び出しに失敗しました"
      }, status: :service_unavailable
    end
  end

  # POST /api/google_maps/directions
  def directions
    origin = params[:origin]
    destination = params[:destination]
    mode = params[:mode] || "driving"
    alternatives = params[:alternatives] == "true"

    if origin.blank? || destination.blank?
      render json: {
        success: false,
        error: "出発地と目的地が必要です"
      }, status: :bad_request
      return
    end

    # FastAPI経由でDirections APIを呼び出し
    response = make_request(
      "POST",
      "/api/google-maps/directions",
      {
        origin: origin,
        destination: destination,
        mode: mode,
        alternatives: alternatives
      }
    )

    if response && response["success"]
      render json: {
        success: true,
        geojson: response["geojson"],
        metadata: response["metadata"]
      }, status: :ok
    else
      render json: {
        success: false,
        error: response&.dig("error") || "Directions APIの呼び出しに失敗しました"
      }, status: :service_unavailable
    end
  end

  # POST /api/google_maps/geocode
  def geocode
    if params[:address].blank?
      render json: {
        success: false,
        error: "住所が必要です"
      }, status: :bad_request
      return
    end

    address = params[:address]

    # FastAPI経由でGeocoding APIを呼び出し
    response = make_request(
      "POST",
      "/api/google-maps/geocode",
      { address: address }
    )

    if response && response["success"]
      render json: {
        success: true,
        geojson: response["geojson"],
        metadata: response["metadata"]
      }, status: :ok
    else
      render json: {
        success: false,
        error: response&.dig("error") || "Geocoding APIの呼び出しに失敗しました"
      }, status: :service_unavailable
    end
  end
end
