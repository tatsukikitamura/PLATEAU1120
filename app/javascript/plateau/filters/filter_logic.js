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
 * URL群を読み込んでフィルタを適用する（単一predicate版）
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

/**
 * 複数データ型に対応したフィルタ適用（拡張版）
 * @param {Cesium.Viewer} viewer - Cesiumビューアー
 * @param {string[]} urls - GeoJSON URLの配列
 * @param {Object} predicatesMap - データ型別のフィルタ関数マップ
 * @param {Object} dataTypeMapping - URLとデータ型のマッピング
 */
export async function applyMultiDataTypeFilter(viewer, urls, predicatesMap, dataTypeMapping) {
  for (const url of urls) {
    try {
      const dataTypeInfo = dataTypeMapping[url];
      if (!dataTypeInfo) {
        console.warn(`データ型情報が見つかりません: ${url}`);
        continue;
      }

      const predicate = predicatesMap[dataTypeInfo.dataType];
      if (!predicate) {
        console.warn(`フィルタ関数が見つかりません: ${dataTypeInfo.dataType}`);
        continue;
      }

      // MultiLineStringとPointの場合、地形に沿わせる(clampToGround)
      let ds;
      if (url.includes("MultiLineString") || url.includes("Point")) {
        ds = await Cesium.GeoJsonDataSource.load(url, {
          clampToGround: true,
        });
      } else {
        ds = await Cesium.GeoJsonDataSource.load(url);
      }
      
      const entities = ds.entities.values;

      // 読み込んだ全データに対し、表示条件をリセット（loadGeoJSONと同じ設定）
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

      let visibleCount = 0;
      let hiddenCount = 0;

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

        // フィルタ判定結果に応じて表示/非表示を設定
        entity.show = keep;
        
        if (keep) {
          visibleCount++;
        } else {
          hiddenCount++;
        }
      }

      // データソースに名前を設定（クリア機能のため）
      ds._name = `GeoJSON_${url.split("/").pop()}`;
      
      viewer.dataSources.add(ds);
      console.log(`[${dataTypeInfo.dataType}] フィルタ適用完了: ${ds._name}`);
      console.log(`[${dataTypeInfo.dataType}] 結果 → 表示: ${visibleCount}件, 非表示: ${hiddenCount}件`);
    } catch (e) {
      console.error(`フィルタ適用時のエラー: ${url}`, e);
    }
  }
}
