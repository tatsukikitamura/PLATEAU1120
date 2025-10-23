# Pin npm packages by running ./bin/importmap

pin "application"
pin "leaflet_application"
pin "cesium_application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"

# PLATEAU関連のJavaScriptモジュール（必要な時のみ読み込み）
pin_all_from "app/javascript/plateau", under: "plateau"
