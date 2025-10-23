Rails.application.routes.draw do
  root "main#home"
  get "cesium", to: "main#cesium"
  get "map2d", to: "main#map2d"
  get "index", to: "main#index"
  get "tourist_route", to: "main#tourist_route"
  get "info", to: "main#info"
end
