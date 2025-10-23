// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails";
import "controllers";

// DOMが読み込まれた後に実行
document.addEventListener("DOMContentLoaded", async function () {
  // Cesiumはscriptタグでグローバルに読み込まれている
  const Cesium = window.Cesium;

  if (!Cesium) {
    console.error(
      "Cesiumライブラリが読み込まれていません。レイアウトファイルのscriptタグを確認してください。"
    );
    return;
  }

  // Cesium Base URLの設定
  window.CESIUM_BASE_URL =
    "https://cesium.com/downloads/cesiumjs/releases/1.134/Build/Cesium/";

  console.log("Cesium loaded successfully");

  // Cesium Ion アクセストークンをmetaタグから取得
  const tokenMeta = document.querySelector('meta[name="cesium-ion-token"]');
  const accessToken = tokenMeta ? tokenMeta.content : "";

  if (!accessToken) {
    console.warn(
      "Cesium Ion アクセストークンが設定されていません。.envファイルにCESIUM_ION_ACCESS_TOKENを設定してください。"
    );
  } else {
    // Cesium Ion アクセストークンの設定
    Cesium.Ion.defaultAccessToken = accessToken;
    console.log("Cesium Ion アクセストークンが設定されました");
  }

  // Cesiumビューアーの初期化
  const viewer = new Cesium.Viewer("cesiumContainer", {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    // 下部のウィジェットを無効化
    timeline: false,           // タイムラインを非表示
    animation: false,          // アニメーションコントロールを非表示
    baseLayerPicker: false,    // ベースレイヤーピッカーを非表示
    fullscreenButton: false,   // フルスクリーンボタンを非表示
    vrButton: false,          // VRボタンを非表示
    geocoder: false,          // ジオコーダーを非表示
    homeButton: false,        // ホームボタンを非表示
    sceneModePicker: false,   // シーンモードピッカーを非表示
    navigationHelpButton: false, // ナビゲーションヘルプボタンを非表示
    navigationInstructionsInitiallyVisible: false, // ナビゲーション指示を非表示
  });

  // カメラの初期位置設定（千葉県付近）
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(140.12, 35.6, 400),
  });

  // 新しいモジュールパスからインポート
  const { initializeUIController } = await import("plateau/ui/controller");

  // メイン処理の実行
  await main(viewer, {
    initializeUIController,
  });
});

/**
 * メイン関数
 */
async function main(viewer, modules) {
  const { initializeUIController } = modules;

  // UIコントローラーの初期化のみ実行
  // データのロードは各ボタンから実行される
  initializeUIController(viewer);
}
