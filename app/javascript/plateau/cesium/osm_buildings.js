/**
 * OSM Buildings読み込み機能
 */

/**
 * OSM Buildingsを読み込んでビューアーに追加する
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 */
export async function loadOsmBuildings(viewer) {
  try {
    const buildingTileset = await Cesium.createOsmBuildingsAsync();
    viewer.scene.primitives.add(buildingTileset);
    console.log("OSM Buildings読み込み成功");
  } catch (error) {
    console.error("OSM Buildings読み込みエラー:", error);
  }
}
