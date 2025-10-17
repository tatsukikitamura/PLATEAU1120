# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "cesium", to: "https://cesium.com/downloads/cesiumjs/releases/1.134/Build/Cesium/Cesium.js"
pin "@spz-loader/core", to: "@spz-loader--core.js" # @0.3.0
pin "@tweenjs/tween.js", to: "@tweenjs--tween.js.js" # @25.0.0
pin "@zip.js/zip.js/lib/zip-core.js", to: "@zip.js--zip.js--lib--zip-core.js.js" # @2.8.0
pin "autolinker" # @4.1.5
pin "bitmap-sdf" # @1.0.4
pin "dompurify" # @3.3.0
pin "earcut" # @3.0.2
pin "grapheme-splitter" # @1.0.4
pin "jsep" # @1.4.0
pin "kdbush" # @4.0.2
pin "lerc" # @2.0.0
pin "mersenne-twister" # @1.1.0
pin "meshoptimizer" # @0.25.0
pin "nosleep.js" # @0.12.0
pin "protobufjs/dist/minimal/protobuf.js", to: "protobufjs--dist--minimal--protobuf.js.js" # @7.5.4
pin "quickselect" # @3.0.0
pin "rbush" # @4.0.1
pin "topojson-client" # @3.1.0
pin "tslib" # @2.8.1
pin "urijs" # @1.19.11

# アプリケーション固有のJavaScriptファイル
pin "geojsonLoader", to: "geojsonLoader.js", preload: true
pin "3dtile", to: "3dtile.js", preload: true
pin "osmBuildings", to: "osmBuildings.js", preload: true
pin "controller", to: "controller.js", preload: true
pin "geojson", to: "geojson.js", preload: true
pin "dataManager", to: "dataManager.js", preload: true
pin "schema", to: "schema.js", preload: true