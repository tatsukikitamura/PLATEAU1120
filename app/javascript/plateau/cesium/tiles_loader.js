/**
 * 3D Tiles読み込み機能
 */

export const TILESET_URLS = [
  "/data/tileset/bldg/bldg_3dtiles_lod1/tileset.json",
  "/data/tileset/bldg/bldg_3dtiles_lod2/tileset.json",
  "/data/tileset/bldg/bldg_3dtiles_lod2_no_texture/tileset.json",
  "/data/tileset/brid/brid_3dtiles_lod2/tileset.json",
];

/**
 * 3D Tilesを読み込んでビューアーに追加する
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 * @param {string[]} urls - 3D TilesetのURL配列
 */
export async function load3DTiles(viewer, urls) {
  for (const url of urls) {
    try {
      const tileset = await Cesium.Cesium3DTileset.fromUrl(url);
      viewer.scene.primitives.add(tileset);

      // 3D Tilesetのスタイル設定
      const style = new Cesium.Cesium3DTileStyle({
        color: "color('green')",
      });
      tileset.style = style;

      console.log(`3D Tiles読み込み成功: ${url}`);
    } catch (error) {
      console.error(`3D Tiles読み込みエラー: ${url}`, error);
    }
  }
}
