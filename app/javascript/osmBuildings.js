/**
 * OSM Buildings関連の機能を管理するモジュール
 */

/**
 * 非同期で OSM Buildings をロードする関数
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 */
export async function loadOsmBuildings(viewer) {
  try {
    const buildingTileset = await Cesium.createOsmBuildingsAsync();
    viewer.scene.primitives.add(buildingTileset);
  } catch (error) {
    console.error('OSM Buildingsの読み込みエラー:', error);
  }
}
