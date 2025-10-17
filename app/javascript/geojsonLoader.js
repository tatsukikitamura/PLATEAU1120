import { filterGeoJSON } from 'geojson';

export const geourls = [
    '/data/geoJSON/MultiLineString/border.geojson',
    '/data/geoJSON/MultiLineString/emergency_route.geojson',
    '/data/geoJSON/MultiLineString/railway.geojson',
    '/data/geoJSON/Point/landmark.geojson',
    '/data/geoJSON/Point/park.geojson',
    '/data/geoJSON/Point/shelter.geojson',
    '/data/geoJSON/Point/station.geojson',
];
  
/**
 * GeoJSONを読み込み、ズーム時に消える問題を修正してビューアーに追加する関数
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 * @param {string[]} urls - GeoJSONのURL配列
 */
export async function loadGeoJSON(viewer, urls) {
  for (const url of urls) {
    try {
      let dataSource;

      // 変更点①: MultiLineString（線）の場合、地形に沿わせる(clampToGround)
      if (url.includes('MultiLineString') || url.includes('Point')) {
        dataSource = await Cesium.GeoJsonDataSource.load(url, {
          clampToGround: true, // これで線が地形に埋もれるのを防ぎます
        });
      } else {
        // Pointの場合は通常通り読み込み
        dataSource = await Cesium.GeoJsonDataSource.load(url);
      }

      // 変更点②: 読み込んだ全データに対し、表示条件をリセット
      const entities = dataSource.entities.values;
      for (const entity of entities) {
        // Billboard (アイコン) や Point (点) の表示条件を解除
        if (entity.point) {
          entity.point.distanceDisplayCondition = undefined;
          entity.point.scaleByDistance = undefined;
          entity.point.zIndex = 100;
        }
        // Polyline (線) の表示条件も解除
        if (entity.polyline) {
          entity.polyline.distanceDisplayCondition = undefined;
          entity.polyline.scaleByDistance = undefined;
          
        }
      }

      // データソースに名前を設定（クリア機能のため）
      dataSource._name = `GeoJSON_${url.split('/').pop()}`;
      
      viewer.dataSources.add(dataSource);
      console.log(`GeoJSON処理・追加完了: ${url} (名前: ${dataSource._name})`);

    } catch (error) {
      console.error(`GeoJSON読み込み・処理エラー (${url}):`, error);
    }
  }
}
