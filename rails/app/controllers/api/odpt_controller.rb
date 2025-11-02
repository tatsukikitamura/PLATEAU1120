class Api::OdptController < ApplicationController
  include FastApiClient

  def passenger_survey
    year = params[:year]&.to_i
    operator = params[:operator]
    
    # FastAPI経由でODPT APIを呼び出し
    request_params = {}
    request_params[:year] = year if year
    request_params[:operator] = operator if operator
    
    response = make_request(
      "GET",
      "/api/odpt/passenger-survey",
      request_params
    )
    
    if response && response["success"]
      render json: {
        success: true,
        data: response["data"]
      }
    else
      render json: {
        success: false,
        error: response&.dig("error") || "ODPT APIの呼び出しに失敗しました"
      }, status: :service_unavailable
    end
  rescue => e
    render json: { success: false, error: e.message }, status: 500
  end

  def passenger_heatmap
    time_slot = params[:time_slot] || "noon"
    year = params[:year]&.to_i
    operator = params[:operator]
    
    # FastAPI経由でODPT APIを呼び出し
    request_params = { time_slot: time_slot }
    request_params[:year] = year if year
    request_params[:operator] = operator if operator
    
    response = make_request(
      "GET",
      "/api/odpt/passenger-heatmap",
      request_params
    )
    
    if response && response["success"]
      render json: {
        success: true,
        time_slot: response["time_slot"],
        data: response["data"]
      }
    else
      render json: {
        success: false,
        error: response&.dig("error") || "ODPT APIの呼び出しに失敗しました"
      }, status: :service_unavailable
    end
  rescue => e
    render json: { success: false, error: e.message }, status: 500
  end
end
