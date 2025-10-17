export const urls = [
    '/data/tileset/bldg/bldg_3dtiles_lod1/tileset.json',
    '/data/tileset/bldg/bldg_3dtiles_lod2/tileset.json',
    '/data/tileset/bldg/bldg_3dtiles_lod2_no_texture/tileset.json',
    '/data/tileset/brid/brid_3dtiles_lod2/tileset.json'
  ];

export async function load3dTile(viewer,urls) {
    for (const url of urls) {
      try {
        const tileset = await Cesium.Cesium3DTileset.fromUrl(url);
        viewer.scene.primitives.add(tileset);
        
        // 3D Tilesetのスタイル設定
        const style = new Cesium.Cesium3DTileStyle({
          color: "color('green')"
        });
        tileset.style = style;
      } catch (error) {
        console.error(`3D Tilesetの読み込みエラー: ${url}`, error);
      }
    }
  }