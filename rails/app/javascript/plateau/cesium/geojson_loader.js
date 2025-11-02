/**
 * GeoJSON読み込み機能
 */

import { setDescriptionsForEntities, addInfoBoxStyles } from "plateau/cesium/infobox_customizer";

// InfoBoxのスタイルを追加（初回のみ）
addInfoBoxStyles();

export const GEOJSON_URLS = [
  "/data/geoJSON/MultiLineString/border.geojson",
  "/data/geoJSON/MultiLineString/emergency_route.geojson",
  "/data/geoJSON/MultiLineString/railway.geojson",
  "/data/geoJSON/Point/landmark.geojson",
  "/data/geoJSON/Point/park.geojson",
  "/data/geoJSON/Point/shelter.geojson",
  "/data/geoJSON/Point/station.geojson",
];

/**
 * GeoJSONを読み込み、ビューアーに追加する
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 * @param {string[]} urls - GeoJSONのURL配列
 */
export async function loadGeoJSON(viewer, urls) {
  for (const url of urls) {
    try {
      let dataSource;

      // MultiLineStringとPointの場合、地形に沿わせる(clampToGround)
      if (url.includes("MultiLineString") || url.includes("Point")) {
        dataSource = await Cesium.GeoJsonDataSource.load(url, {
          clampToGround: true,
        });
      } else {
        dataSource = await Cesium.GeoJsonDataSource.load(url);
      }

      // 読み込んだ全データに対し、表示条件をリセット
      const entities = dataSource.entities.values;
      
      // InfoBoxのdescriptionを設定
      setDescriptionsForEntities(entities);
      
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
      dataSource._name = `GeoJSON_${url.split("/").pop()}`;

      viewer.dataSources.add(dataSource);
      console.log(`GeoJSON読み込み成功: ${url} (名前: ${dataSource._name})`);
    } catch (error) {
      console.error(`GeoJSON読み込みエラー (${url}):`, error);
    }
  }
}
