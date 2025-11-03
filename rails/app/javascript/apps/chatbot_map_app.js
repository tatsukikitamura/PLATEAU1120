// Chatbot Map Integration - App Entrypoint
console.log("📦 apps/chatbot_map_app.js モジュールがロードされました");
import ChatbotUI from "chatbot";
import ChatbotService from "services/ChatbotService";

// DOMが読み込まれた後に実行
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Chatbot Map application starting...");

  // Cesiumライブラリの読み込み完了を待つ関数
  function waitForCesium() {
    return new Promise((resolve) => {
      if (window.Cesium) {
        resolve();
      } else {
        const checkCesium = () => {
          if (window.Cesium) {
            resolve();
          } else {
            setTimeout(checkCesium, 100);
          }
        };
        checkCesium();
      }
    });
  }

  // Cesiumライブラリの読み込み完了を待つ
  await waitForCesium();
  
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

  // Cesium Ion アクセストークンの設定
  const accessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmMWU2NjU3Mi1jZjdkLTQxYzQtODIyNS1lZGQ5YmIwOTRmNzYiLCJpZCI6MzQ3NTk0LCJpYXQiOjE3NjA2NzkzOTF9.J6Eo9oYzvX08PzLdmtESdmPZnZF09IKP9bmmuQRsGdk";
  if (accessToken) {
    Cesium.Ion.defaultAccessToken = accessToken;
    console.log("Cesium Ion アクセストークンが設定されました");
  }

  // Cesiumビューアーの初期化
  const viewer = new Cesium.Viewer("cesiumContainer", {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    vrButton: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
  });

  // カメラの初期位置設定（千葉県付近）
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(140.12, 35.6, 400),
  });

  // グローバルにビューアーを保存（チャット側からアクセス可能に）
  window.cesiumViewer = viewer;

  // モジュールのインポート
  const { loadGeoJSON } = await import("plateau/cesium/geojson_loader");
  const { loadGoogleMapsPlaces, loadGoogleMapsGeocode, loadGoogleMapsDirections } = await import("plateau/cesium/google_maps_loader");
  const { load3DTiles, TILESET_URLS } = await import("plateau/cesium/tiles_loader");
  const { loadOsmBuildings } = await import("plateau/cesium/osm_buildings");
  
  window.loadGeoJSONToMap = loadGeoJSON;
  window.loadGoogleMapsPlaces = loadGoogleMapsPlaces;
  window.loadGoogleMapsGeocode = loadGoogleMapsGeocode;
  window.loadGoogleMapsDirections = loadGoogleMapsDirections;

  // Cesiumビューアーの初期化完了
  console.log("Cesium viewer initialized successfully");
  
  // デフォルトでOSM buildingと3DTilesをロード
  try {
    console.log("OSM Buildingsと3D Tilesをロードしています...");
    await loadOsmBuildings(viewer);
    await load3DTiles(viewer, TILESET_URLS);
    console.log("OSM Buildingsと3D Tilesのロードが完了しました");
  } catch (error) {
    console.error("OSM Buildingsまたは3D Tilesのロードエラー:", error);
  }
  
  // ChatbotUIの初期化（UI制御をクラスに委譲）
  const chatbot = new ChatbotUI({
    chatMessages: document.getElementById('chatbot-messages'),
    chatForm: document.getElementById('chatForm'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    sampleQuestionButtons: Array.from(document.querySelectorAll('.sample-question-btn')),
  }, {
    chatbotService: new ChatbotService(),
    onPlotSelectedData: (selectedData) => {
      try {
        if (!Array.isArray(selectedData) || selectedData.length === 0) return;
        const urls = selectedData.map(d => `/data/geoJSON/${d.data_type}/${d.name}.geojson`);
        if (urls.length > 0) {
          window.loadGeoJSONToMap(viewer, urls);
        }
      } catch (e) {
        console.error('plot selected data error:', e);
      }
    },
    onGoogleMapsQuery: async (query) => {
      if (!query || !query.type) return null;
      try {
        let result = null;
        switch (query.type) {
          case 'places':
            result = await window.loadGoogleMapsPlaces(viewer, {
              query: query.query,
              location: query.params?.location,
              radius: query.params?.radius || 5000,
              type: query.params?.type
            });
            break;
          case 'geocode':
            result = await window.loadGoogleMapsGeocode(viewer, query.query);
            break;
          case 'directions':
            await window.loadGoogleMapsDirections(viewer, {
              origin: query.params?.origin,
              destination: query.params?.destination,
              mode: query.params?.mode || 'driving'
            });
            break;
        }
        return result;
      } catch (e) {
        console.error('google maps call error:', e);
        throw e;
      }
    },
    onClear: () => {
      try {
        viewer.dataSources.removeAll();
        viewer.entities.removeAll();
        if (viewer.scene && viewer.scene.primitives) {
          viewer.scene.primitives.removeAll();
        }
        if (viewer.scene) viewer.scene.requestRender();
        console.log('Map data cleared');
      } catch (e) {
        console.warn('onClear failed to clear map:', e);
      }
    }
  });
});


