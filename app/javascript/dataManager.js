/**
 * データ管理機能を提供するモジュール
 */

/**
 * 既存のGeoJSONデータソースをクリアする関数
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 */
export function clearGeoJSONDataSources(viewer) {
  const dataSources = viewer.dataSources;
  console.log('=== clearGeoJSONDataSources() デバッグ開始 ===');
  console.log('現在のデータソース数:', dataSources.length);
  
  // 各データソースの詳細をログ出力
  for (let i = 0; i < dataSources.length; i++) {
    const dataSource = dataSources.get(i);
    console.log(`データソース ${i}:`, {
      name: dataSource._name,
      entities: dataSource.entities ? dataSource.entities.values.length : 'N/A',
      isGeoJSON: dataSource._name && dataSource._name.includes('GeoJSON'),
      isGeoJsonDataSource: dataSource instanceof Cesium.GeoJsonDataSource
    });
  }
  
  // 削除処理（より確実な方法でGeoJSONデータソースを識別）
  let removedCount = 0;
  for (let i = dataSources.length - 1; i >= 0; i--) {
    const dataSource = dataSources.get(i);
    const isGeoJSON = (dataSource._name && dataSource._name.includes('GeoJSON')) || 
                      (dataSource instanceof Cesium.GeoJsonDataSource);
    
    if (isGeoJSON) {
      console.log(`削除対象: ${dataSource._name || '名前なしGeoJSON'}`);
      viewer.dataSources.remove(dataSource);
      removedCount++;
    }
  }
  
  console.log(`削除されたデータソース数: ${removedCount}`);
  console.log('削除後のデータソース数:', dataSources.length);
  console.log('=== clearGeoJSONDataSources() デバッグ終了 ===');
}
