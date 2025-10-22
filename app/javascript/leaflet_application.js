// Leaflet 2Dマップ用のエントリーポイント

// DOMが読み込まれた後に実行
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Leaflet application starting...");

  // Leafletがグローバルに読み込まれているか確認
  if (typeof L === 'undefined') {
    console.error("Leafletライブラリが読み込まれていません");
    return;
  }

  console.log("Leaflet loaded successfully");

  // Leafletコントローラーをインポート
  const { initializeLeafletController } = await import("plateau/leaflet/leaflet_controller");

  // Leafletコントローラーの初期化
  initializeLeafletController();

  console.log("Leaflet controller initialized");
});

