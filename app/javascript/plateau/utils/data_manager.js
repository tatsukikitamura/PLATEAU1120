/**
 * データ管理ユーティリティ
 */

/**
 * 既存のGeoJSONデータソースをクリアする
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 */
export function clearGeoJSONDataSources(viewer) {
  const dataSources = viewer.dataSources;
  
  // 開発環境でのみ詳細ログを出力
  const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
  
  if (isDevelopment) {
    console.log("=== clearGeoJSONDataSources() 実行開始 ===");
    console.log("現在のデータソース数:", dataSources.length);

    // 各データソースの詳細をログ出力
    for (let i = 0; i < dataSources.length; i++) {
      const dataSource = dataSources.get(i);
      console.log(`データソース ${i}:`, {
        name: dataSource._name,
        entities: dataSource.entities ? dataSource.entities.values.length : "N/A",
        isGeoJSON: dataSource._name && dataSource._name.includes("GeoJSON"),
        isGeoJsonDataSource: dataSource instanceof Cesium.GeoJsonDataSource,
      });
    }
  }

  // 削除処理（GeoJSONデータソースのみを識別して削除）
  let removedCount = 0;
  for (let i = dataSources.length - 1; i >= 0; i--) {
    const dataSource = dataSources.get(i);
    const isGeoJSON =
      (dataSource._name && dataSource._name.includes("GeoJSON")) ||
      dataSource instanceof Cesium.GeoJsonDataSource;

    if (isGeoJSON) {
      if (isDevelopment) {
        console.log(`削除対象: ${dataSource._name || "名前なしGeoJSON"}`);
      }
      viewer.dataSources.remove(dataSource);
      removedCount++;
    }
  }

  if (isDevelopment) {
    console.log(`削除されたデータソース数: ${removedCount}`);
    console.log("削除後のデータソース数:", dataSources.length);
    console.log("=== clearGeoJSONDataSources() 実行完了 ===");
  }
}
