// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"

// Cesiumをスクリプトタグで読み込む関数
function loadCesiumViaScript() {
  return new Promise((resolve, reject) => {
    if (window.Cesium) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.134/Build/Cesium/Cesium.js';
    script.onload = () => {
      console.log('Cesium loaded via script tag');
      resolve();
    };
    script.onerror = () => {
      console.error('Failed to load Cesium via script tag');
      reject(new Error('Failed to load Cesium'));
    };
    document.head.appendChild(script);
  });
}

// DOMが読み込まれた後に実行
document.addEventListener('DOMContentLoaded', async function() {
  // Cesiumを動的にインポート（複数の方法を試す）
  let Cesium;
  try {
    // 方法1: 通常の動的インポート
    const cesiumModule = await import('cesium');
    console.log('Cesium module loaded:', cesiumModule);
    console.log('Cesium module keys:', Object.keys(cesiumModule));
    
    // デフォルトエクスポートまたはモジュール全体を使用
    Cesium = cesiumModule.default || cesiumModule;
    
    // 方法2: もしCesiumが空の場合、グローバルから取得を試す
    if (!Cesium || Object.keys(Cesium).length === 0) {
      console.log('Trying to get Cesium from global window...');
      Cesium = window.Cesium;
    }
    
    // 方法3: まだ取得できない場合、スクリプトタグで読み込み
    if (!Cesium || Object.keys(Cesium).length === 0) {
      console.log('Loading Cesium via script tag...');
      await loadCesiumViaScript();
      Cesium = window.Cesium;
    }
    
  } catch (error) {
    console.error('Cesiumライブラリの読み込みに失敗しました:', error);
    return;
  }

  window.CESIUM_BASE_URL = 'https://cesium.com/downloads/cesiumjs/releases/1.134/Build/Cesium/';
  
  // Cesiumが正しく読み込まれているかチェック
  if (!Cesium || Object.keys(Cesium).length === 0) {
    console.error('Cesiumライブラリが正しく読み込まれていません');
    return;
  }
  
  // デバッグ: Cesiumオブジェクトの構造を確認
  console.log('Cesium object:', Cesium);
  console.log('Cesium.Ion:', Cesium.Ion);
  console.log('Cesium keys:', Object.keys(Cesium));
  console.log('Cesium.Terrain:', Cesium.Terrain);
  
  // Cesium Ion アクセストークンの設定（複数の方法を試す）
  try {
    // 方法1: Cesium.Ion.defaultAccessToken
    if (Cesium.Ion && Cesium.Ion.defaultAccessToken !== undefined) {
      Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmMWU2NjU3Mi1jZjdkLTQxYzQtODIyNS1lZGQ5YmIwOTRmNzYiLCJpZCI6MzQ3NTk0LCJpYXQiOjE3NjA2NzkzOTF9.J6Eo9oYzvX08PzLdmtESdmPZnZF09IKP9bmmuQRsGdk';
      console.log('Cesium Ion アクセストークンが設定されました（方法1）');
    }
    // 方法2: Cesium.Ion.defaultAccessToken（直接設定）
    else if (Cesium.Ion) {
      Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmMWU2NjU3Mi1jZjdkLTQxYzQtODIyNS1lZGQ5YmIwOTRmNzYiLCJpZCI6MzQ3NTk0LCJpYXQiOjE3NjA2NzkzOTF9.J6Eo9oYzvX08PzLdmtESdmPZnZF09IKP9bmmuQRsGdk';
      console.log('Cesium Ion アクセストークンが設定されました（方法2）');
    }
    // 方法3: グローバル設定
    else if (typeof window !== 'undefined') {
      window.CESIUM_ION_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmMWU2NjU3Mi1jZjdkLTQxYzQtODIyNS1lZGQ5YmIwOTRmNzYiLCJpZCI6MzQ3NTk0LCJpYXQiOjE3NjA2NzkzOTF9.J6Eo9oYzvX08PzLdmtESdmPZnZF09IKP9bmmuQRsGdk';
      console.log('Cesium Ion アクセストークンが設定されました（方法3: グローバル）');
    }
    else {
      console.warn('Cesium.Ion が利用できません。アクセストークンの設定をスキップします。');
    }
  } catch (error) {
    console.error('Cesium Ion アクセストークンの設定でエラーが発生しました:', error);
  }

  // Cesiumビューアーの初期化（アクセストークンを設定）
  const viewer = new Cesium.Viewer('cesiumContainer', {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    // アクセストークンをViewerの初期化時に設定
    ...(window.CESIUM_ION_ACCESS_TOKEN && { 
      ionAccessToken: window.CESIUM_ION_ACCESS_TOKEN 
    })
  });    

  // カメラの初期位置設定
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(140.12, 35.60, 400),
  });

  // 他のモジュールを動的にインポート
  const { geourls, loadGeoJSON } = await import('geojsonLoader');
  const { urls, load3dTile } = await import('3dtile');
  const { loadOsmBuildings } = await import('osmBuildings');
  const { initializeUIController } = await import('controller');

  // メイン処理の実行
  await main(viewer, { geourls, loadGeoJSON, urls, load3dTile, loadOsmBuildings, initializeUIController });
});

/**
 * メイン関数
 */
async function main(viewer, modules) {
  const { geourls, loadGeoJSON, urls, load3dTile, loadOsmBuildings, initializeUIController } = modules;
  
  // OSM Buildingsの読み込み
  await loadOsmBuildings(viewer);
  
  // 3D Tilesetの読み込み
  load3dTile(viewer, urls);
  
  // GeoJSONデータの読み込み
  loadGeoJSON(viewer, geourls);
  
  // UIコントローラーの初期化
  initializeUIController(viewer);
}