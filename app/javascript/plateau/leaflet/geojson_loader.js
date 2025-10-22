/**
 * Leaflet用のGeoJSON読み込み機能
 */

export const GEOJSON_URLS = [
  "/data/geoJSON/MultiLineString/border.geojson",
  "/data/geoJSON/MultiLineString/emergency_route.geojson",
  "/data/geoJSON/MultiLineString/railway.geojson",
  "/data/geoJSON/Point/landmark.geojson",
  "/data/geoJSON/Point/park.geojson",
  "/data/geoJSON/Point/shelter.geojson",
  "/data/geoJSON/Point/station.geojson",
];

// 読み込まれたレイヤーを保存
let loadedLayers = [];

/**
 * GeoJSONを読み込んでLeafletマップに追加する
 * @param {L.Map} map - Leafletマップインスタンス
 * @param {string[]} urls - GeoJSONのURL配列
 */
export async function loadGeoJSON(map, urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const geojsonData = await response.json();

      // GeoJSONレイヤーを作成
      const layer = L.geoJSON(geojsonData, {
        pointToLayer: function (feature, latlng) {
          // Pointの場合はCircleMarkerを使用
          return L.circleMarker(latlng, {
            radius: 6,
            fillColor: getFeatureColor(feature, url),
            color: "#fff",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
          });
        },
        style: function (feature) {
          // LineStringやMultiLineStringのスタイル
          return {
            color: getFeatureColor(feature, url),
            weight: 3,
            opacity: 0.7
          };
        },
        onEachFeature: function (feature, layer) {
          // ポップアップの設定
          if (feature.properties) {
            const popupContent = createPopupContent(feature.properties);
            layer.bindPopup(popupContent);
          }
        }
      });

      layer.addTo(map);
      loadedLayers.push({ url, layer });
      
      console.log(`GeoJSON読み込み成功: ${url}`);
    } catch (error) {
      console.error(`GeoJSON読み込みエラー (${url}):`, error);
    }
  }
}

/**
 * フィーチャーの色を取得
 * @param {Object} feature - GeoJSONフィーチャー
 * @param {string} url - データのURL
 * @returns {string} 色コード
 */
function getFeatureColor(feature, url) {
  if (url.includes("landmark")) return "#FF6B6B";
  if (url.includes("park")) return "#51CF66";
  if (url.includes("shelter")) return "#339AF0";
  if (url.includes("station")) return "#FFA500";
  if (url.includes("border")) return "#868E96";
  if (url.includes("emergency_route")) return "#FF0000";
  if (url.includes("railway")) return "#6741D9";
  return "#0078d4";
}

/**
 * ポップアップのコンテンツを作成
 * @param {Object} properties - フィーチャーのプロパティ
 * @returns {string} HTMLコンテンツ
 */
function createPopupContent(properties) {
  let content = '<div style="max-width: 250px;">';
  
  for (const [key, value] of Object.entries(properties)) {
    if (value !== null && value !== undefined) {
      content += `<strong>${key}:</strong> ${value}<br>`;
    }
  }
  
  content += '</div>';
  return content;
}

/**
 * 読み込まれた全てのGeoJSONレイヤーをクリア
 * @param {L.Map} map - Leafletマップインスタンス
 */
export function clearGeoJSONLayers(map) {
  console.log("=== clearGeoJSONLayers() 実行開始 ===");
  console.log(`現在のレイヤー数: ${loadedLayers.length}`);
  
  for (const { url, layer } of loadedLayers) {
    map.removeLayer(layer);
    console.log(`削除対象: ${url}`);
  }
  
  const removedCount = loadedLayers.length;
  loadedLayers = [];
  
  console.log(`削除されたレイヤー数: ${removedCount}`);
  console.log(`削除後のレイヤー数: ${loadedLayers.length}`);
  console.log("=== clearGeoJSONLayers() 実行完了 ===");
}

/**
 * 読み込まれたレイヤーの配列を取得
 * @returns {Array} レイヤー配列
 */
export function getLoadedLayers() {
  return loadedLayers;
}

