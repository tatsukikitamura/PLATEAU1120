/**
 * Google Maps API GeoJSON Loader for CesiumJS
 */

/**
 * Google Maps APIからPlaces検索結果を取得し、CesiumJSで表示
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 * @param {Object} searchParams - 検索パラメータ
 * @param {string} searchParams.query - 検索クエリ
 * @param {Object} searchParams.location - 位置情報 {lat, lng}
 * @param {number} searchParams.radius - 検索半径（メートル）
 * @param {string} searchParams.type - 場所のタイプ（restaurant, hotel等）
 * @param {Object} options - 表示オプション
 */
export async function loadGoogleMapsPlaces(viewer, searchParams, options = {}) {
  try {
    const response = await fetch('/api/google_maps/search_places', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
      },
      body: JSON.stringify(searchParams)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Places APIの呼び出しに失敗しました');
    }

    // GeoJSONデータをCesiumJSで表示
    const dataSource = await Cesium.GeoJsonDataSource.load(data.geojson, {
      clampToGround: true,
      stroke: options.stroke || Cesium.Color.HOTPINK,
      fill: options.fill || Cesium.Color.PINK,
      strokeWidth: options.strokeWidth || 2,
      markerSymbol: options.markerSymbol || '?'
    });

    // データソースに名前を設定
    dataSource._name = `GoogleMaps_Places_${searchParams.query}_${Date.now()}`;
    
    viewer.dataSources.add(dataSource);
    
    // 検索結果にズーム
    if (data.geojson.features.length > 0) {
      viewer.flyTo(dataSource);
    }

    console.log(`Google Maps Places読み込み成功: ${data.metadata.feature_count}件の結果`);
    return dataSource;

  } catch (error) {
    console.error('Google Maps Places読み込みエラー:', error);
    throw error;
  }
}

/**
 * Google Maps APIからルート情報を取得し、CesiumJSで表示
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 * @param {Object} routeParams - ルートパラメータ
 * @param {string} routeParams.origin - 出発地
 * @param {string} routeParams.destination - 目的地
 * @param {string} routeParams.mode - 移動手段（driving, walking, bicycling, transit）
 * @param {boolean} routeParams.alternatives - 代替ルートを取得するか
 * @param {Object} options - 表示オプション
 */
export async function loadGoogleMapsDirections(viewer, routeParams, options = {}) {
  try {
    const response = await fetch('/api/google_maps/directions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
      },
      body: JSON.stringify(routeParams)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Directions APIの呼び出しに失敗しました');
    }

    // GeoJSONデータをCesiumJSで表示
    const dataSource = await Cesium.GeoJsonDataSource.load(data.geojson, {
      clampToGround: true,
      stroke: options.stroke || Cesium.Color.YELLOW,
      strokeWidth: options.strokeWidth || 4,
      material: options.material || Cesium.Color.YELLOW
    });

    // データソースに名前を設定
    dataSource._name = `GoogleMaps_Directions_${routeParams.origin}_to_${routeParams.destination}_${Date.now()}`;
    
    viewer.dataSources.add(dataSource);
    
    // ルート全体にズーム
    if (data.geojson.features.length > 0) {
      viewer.flyTo(dataSource);
    }

    console.log(`Google Maps Directions読み込み成功: ${data.metadata.route_count}件のルート`);
    return dataSource;

  } catch (error) {
    console.error('Google Maps Directions読み込みエラー:', error);
    throw error;
  }
}

/**
 * Google Maps APIから住所の座標を取得し、CesiumJSで表示
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 * @param {string} address - 住所
 * @param {Object} options - 表示オプション
 */
export async function loadGoogleMapsGeocode(viewer, address, options = {}) {
  try {
    const response = await fetch('/api/google_maps/geocode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
      },
      body: JSON.stringify({ address: address })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Geocoding APIの呼び出しに失敗しました');
    }

    // GeoJSONデータをCesiumJSで表示
    const dataSource = await Cesium.GeoJsonDataSource.load(data.geojson, {
      clampToGround: true,
      stroke: options.stroke || Cesium.Color.BLUE,
      fill: options.fill || Cesium.Color.LIGHTBLUE,
      strokeWidth: options.strokeWidth || 2,
      markerSymbol: options.markerSymbol || '📍'
    });

    // データソースに名前を設定
    dataSource._name = `GoogleMaps_Geocode_${address}_${Date.now()}`;
    
    viewer.dataSources.add(dataSource);
    
    // 結果にズーム
    if (data.geojson.features.length > 0) {
      viewer.flyTo(dataSource);
    }

    console.log(`Google Maps Geocoding読み込み成功: ${data.metadata.result_count}件の結果`);
    return dataSource;

  } catch (error) {
    console.error('Google Maps Geocoding読み込みエラー:', error);
    throw error;
  }
}

/**
 * Google Mapsデータソースをクリア
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 * @param {string} prefix - クリアするデータソースの名前のプレフィックス
 */
export function clearGoogleMapsData(viewer, prefix = 'GoogleMaps') {
  const dataSourcesToRemove = [];
  
  viewer.dataSources.values.forEach(dataSource => {
    if (dataSource._name && dataSource._name.startsWith(prefix)) {
      dataSourcesToRemove.push(dataSource);
    }
  });
  
  dataSourcesToRemove.forEach(dataSource => {
    viewer.dataSources.remove(dataSource);
  });
  
  console.log(`${dataSourcesToRemove.length}件のGoogle Mapsデータソースをクリアしました`);
}

/**
 * Google Mapsデータソースの表示/非表示を切り替え
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 * @param {string} prefix - 対象のデータソースの名前のプレフィックス
 * @param {boolean} show - 表示するかどうか
 */
export function toggleGoogleMapsData(viewer, prefix = 'GoogleMaps', show = true) {
  viewer.dataSources.values.forEach(dataSource => {
    if (dataSource._name && dataSource._name.startsWith(prefix)) {
      dataSource.show = show;
    }
  });
  
  console.log(`Google Mapsデータソース（${prefix}）を${show ? '表示' : '非表示'}にしました`);
}
