// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails";
import "controllers";
import "services/markdown";
import "menu_toggle";

// 通常のページ用のJavaScript（Cesium以外）
document.addEventListener("DOMContentLoaded", function () {
  console.log("Application loaded successfully");
});