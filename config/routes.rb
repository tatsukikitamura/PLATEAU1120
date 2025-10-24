Rails.application.routes.draw do
  root "main#home"
  get "cesium", to: "main#cesium"
  get "map2d", to: "main#map2d"
  get "index", to: "main#index"
  get "tourist_route", to: "main#tourist_route"
  get "info", to: "main#info"
  post "reload_data", to: "main#reload_data"

  # API routes
  namespace :api do
    resources :geo_json_data, only: [ :index, :show ] do
      member do
        post :apply_filter
      end
      collection do
        get :statistics
      end
    end

    resources :filter_conditions, only: [ :index, :create, :update, :destroy ] do
      member do
        post :toggle
      end
      collection do
        post :reset_defaults
      end
    end

    # Google Maps API routes
    namespace :google_maps do
      post :search_places
      post :directions
      post :geocode
    end
  end
end
