/**
 * フィルタリングロジック
 */

/**
 * GeoJSONコレクションをフィルタする
 * @param {Array|Object} collection - フィルタ対象のコレクション
 * @param {Function} predicate - フィルタ関数
 * @returns {Array|Object} フィルタ後のコレクション
 */
export function filterGeoJSON(collection, predicate) {
  if (Array.isArray(collection)) {
    return collection.filter(predicate);
  }
  if (
    collection &&
    typeof collection === "object" &&
    Array.isArray(collection.features)
  ) {
    return { ...collection, features: collection.features.filter(predicate) };
  }
  return collection;
}

/**
 * URL群を読み込んでフィルタを適用する
 * @param {Cesium.Viewer} viewer - Cesiumビューアー
 * @param {string[]} urls - GeoJSON URLの配列
 * @param {Function} predicate - フィルタ関数
 */
export async function applyFilterToUrls(viewer, urls, predicate) {
  for (const url of urls) {
    try {
      const ds = await Cesium.GeoJsonDataSource.load(url);
      const entities = ds.entities.values;

      for (const entity of entities) {
        // エンティティのプロパティを取得
        const rawProps = {};
        if (entity.properties && entity.properties._propertyNames) {
          for (const key of entity.properties._propertyNames) {
            rawProps[key] = entity.properties.getValue(Cesium.JulianDate.now())[
              key
            ];
          }
        }

        // フィルタ判定
        const fakeFeature = { properties: rawProps };
        const keep = predicate(fakeFeature);

        // フィルタに合致しない場合は非表示
        if (!keep) {
          entity.show = false;
        }
      }

      viewer.dataSources.add(ds);
      console.log(`フィルタ適用完了: ${url}`);
    } catch (e) {
      console.error(`フィルタ適用時のエラー: ${url}`, e);
    }
  }
}
