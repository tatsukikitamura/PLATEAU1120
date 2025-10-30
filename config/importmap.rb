# Pin npm packages by running ./bin/importmap

pin "application"
pin "leaflet_application"
pin "cesium_application"
pin "chatbot", to: "features/chatbot/ChatbotUI.js"
pin "chatbot_map_application", to: "apps/chatbot_map_app.js"
pin "markdown_renderer"
pin "services/ChatbotService", to: "services/ChatbotService.js"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin "dompurify", to: "dompurify.js"
pin_all_from "app/javascript/controllers", under: "controllers"

# PLATEAU関連のJavaScriptモジュール（必要な時のみ読み込み）
pin_all_from "app/javascript/plateau", under: "plateau"

# InfoBox カスタマイザーを明示的に登録
pin "plateau/cesium/infobox_customizer", to: "infobox_customizer.js"
