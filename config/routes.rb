Rails.application.routes.draw do
  root "main#home"
  get "cesium", to: "main#cesium"
  get "map2d", to: "main#map2d"
  get "index", to: "main#index"
end
