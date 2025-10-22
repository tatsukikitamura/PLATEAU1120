/**
 * データ型マッピング定義
 * GeoJSON URLとスキーマファイルのマッピング、データ型識別子を定義
 */

/**
 * GeoJSON URLとスキーマファイルのマッピング
 */
export const DATA_TYPE_MAPPING = {
  // Point データ
  "/data/geoJSON/Point/landmark.geojson": {
    schemaPath: "/data/geoJSON/Point/schema/landmark.shema.geojson",
    dataType: "landmark",
    displayName: "ランドマーク",
    geometryType: "Point"
  },
  "/data/geoJSON/Point/park.geojson": {
    schemaPath: "/data/geoJSON/Point/schema/park.schema.geojson",
    dataType: "park",
    displayName: "公園",
    geometryType: "Point"
  },
  "/data/geoJSON/Point/shelter.geojson": {
    schemaPath: "/data/geoJSON/Point/schema/shelter.schema.geojson",
    dataType: "shelter",
    displayName: "避難所",
    geometryType: "Point"
  },
  "/data/geoJSON/Point/station.geojson": {
    schemaPath: "/data/geoJSON/Point/schema/station.schema.geojson",
    dataType: "station",
    displayName: "駅",
    geometryType: "Point"
  },
  // MultiLineString データ
  "/data/geoJSON/MultiLineString/border.geojson": {
    schemaPath: null, // スキーマファイルなし
    dataType: "border",
    displayName: "境界線",
    geometryType: "MultiLineString"
  },
  "/data/geoJSON/MultiLineString/emergency_route.geojson": {
    schemaPath: null, // スキーマファイルなし
    dataType: "emergency_route",
    displayName: "緊急避難路",
    geometryType: "MultiLineString"
  },
  "/data/geoJSON/MultiLineString/railway.geojson": {
    schemaPath: null, // スキーマファイルなし
    dataType: "railway",
    displayName: "鉄道",
    geometryType: "MultiLineString"
  }
};

/**
 * URLからデータ型情報を取得する
 * @param {string} url - GeoJSON URL
 * @returns {Object|null} データ型情報オブジェクト
 */
export function getDataTypeInfo(url) {
  return DATA_TYPE_MAPPING[url] || null;
}

/**
 * スキーマファイルを持つデータ型のみをフィルタリング
 * @param {string[]} urls - GeoJSON URL配列
 * @returns {string[]} スキーマファイルを持つURL配列
 */
export function filterUrlsWithSchema(urls) {
  return urls.filter(url => {
    const info = getDataTypeInfo(url);
    return info && info.schemaPath;
  });
}

/**
 * データ型別にURLをグループ化
 * @param {string[]} urls - GeoJSON URL配列
 * @returns {Object} データ型別のURL配列
 */
export function groupUrlsByDataType(urls) {
  const grouped = {};
  
  for (const url of urls) {
    const info = getDataTypeInfo(url);
    if (info) {
      if (!grouped[info.dataType]) {
        grouped[info.dataType] = [];
      }
      grouped[info.dataType].push(url);
    }
  }
  
  return grouped;
}
