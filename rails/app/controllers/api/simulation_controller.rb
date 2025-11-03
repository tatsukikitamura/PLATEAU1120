class Api::SimulationController < ApplicationController
  include FastApiClient

  # POST /api/simulation/run
  def run
    hazard = params[:hazard] || "tsunami"
    area = params[:area]
    start_points = params[:start_points] || []
    shelter_pref = params[:shelter_pref] || "rails-first"
    time = params[:time]
    user_query = params[:user_query]

    body = {
      hazard: hazard,
      area: area,
      start_points: start_points,
      shelter_pref: shelter_pref,
      time: time,
      user_query: user_query
    }.compact

    response = make_request(
      "POST",
      "/api/simulation/run",
      body
    )

    if response && response["success"]
      render json: response, status: :ok
    else
      render json: {
        success: false,
        error: response&.dig("detail") || "Simulation APIの呼び出しに失敗しました"
      }, status: :service_unavailable
    end
  end
end


