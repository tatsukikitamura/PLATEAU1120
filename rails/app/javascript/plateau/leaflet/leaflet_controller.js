/**
 * Leaflet UI操作とイベントリスナーを管理するモジュール
 */
import { loadGeoJSON, clearGeoJSONLayers, GEOJSON_URLS } from "plateau/leaflet/geojson_loader";
import { loadOdptHeatmap } from "plateau/leaflet/odpt_heatmap";
import {
  loadSchema,
  extractPropertyFields,
  buildMultiSchemaPredicates,
} from "plateau/filters/schema";
import {
  renderFilterFields,
  collectCriteriaFromForm,
} from "plateau/filters/filter_form";
import { 
  DATA_TYPE_MAPPING, 
  getDataTypeInfo, 
  filterUrlsWithSchema 
} from "plateau/filters/data_type_mapping";

/**
 * LeafletマップとUIコントローラーを初期化する
 */
export function initializeLeafletController() {
  // Leafletマップの初期化
  const map = L.map('map').setView([35.6, 140.1], 11);

  // 地理院タイルを追加
  L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
    maxZoom: 18,
  }).addTo(map);

  // ODPTヒートマップ（デフォルト：昼）を自動表示
  loadOdptHeatmap(map, { timeSlot: 'noon' });

  // DOM要素の取得
  const pointButton = document.getElementById("point-button");
  const lineButton = document.getElementById("line-button");
  const multiLineButton = document.getElementById("multi-line-button");
  const allDataButton = document.getElementById("all-data-button");
  const homeButton = document.getElementById("home-button");
  const pointSelectionContainer = document.getElementById("point-selection-container");
  const landmarkButton = document.getElementById("landmark-button");
  const parkButton = document.getElementById("park-button");
  const shelterButton = document.getElementById("shelter-button");
  const stationButton = document.getElementById("station-button");
  const allPointsButton = document.getElementById("all-points-button");
  const filterToggleBtn = document.getElementById("filter-toggle-btn");
  const filterFormContainer = document.getElementById("dynamic-filter-form");
  const applyFilterBtn = document.getElementById("apply-filter-btn");
  const clearFilterBtn = document.getElementById("clear-filter-btn");

  // フィルターUIの状態を保持
  const filterState = {
    schemas: {},
    schemaFieldsMap: {},
    criteria: {},
    lastLoadedUrls: [],
  };

  // フィルターコンテナの取得と初期状態設定
  const filterContainer = document.getElementById("filter-container");
  if (filterContainer) {
    filterContainer.style.display = "none"; // 初期状態で非表示
  }

  // フィルターコンテナの表示/非表示を制御する関数
  const showFilterContainer = () => {
    if (filterContainer) {
      filterContainer.style.display = "block";
    }
  };

  const hideFilterContainer = () => {
    if (filterContainer) {
      filterContainer.style.display = "none";
    }
  };

  // フィルターボタンのクリックイベント
  if (filterToggleBtn) {
    filterToggleBtn.addEventListener("click", () => {
      console.log("フィルターボタンがクリックされました");
      if (filterContainer && filterContainer.style.display === "none") {
        showFilterContainer();
      } else {
        hideFilterContainer();
      }
    });
  }

  // 複数スキーマの読み込みとフィールド統合
  async function loadAndMergeSchemas(urls) {
    const schemaUrls = filterUrlsWithSchema(urls);
    const schemaFieldsMap = {};
    
    for (const url of schemaUrls) {
      const dataTypeInfo = getDataTypeInfo(url);
      if (dataTypeInfo && dataTypeInfo.schemaPath) {
        try {
          const schema = await loadSchema(dataTypeInfo.schemaPath);
          const fields = extractPropertyFields(schema);
          schemaFieldsMap[dataTypeInfo.dataType] = fields;
          filterState.schemas[dataTypeInfo.dataType] = schema;
          console.log(`スキーマ読み込み完了: ${dataTypeInfo.dataType}`);
        } catch (e) {
          console.error(`スキーマ読み込みエラー (${dataTypeInfo.dataType}):`, e);
        }
      }
    }
    
    filterState.schemaFieldsMap = schemaFieldsMap;
    return schemaFieldsMap;
  }

  // ホームボタン
  homeButton.addEventListener("click", () => {
    window.location.href = "/";
  });

  // Pointボタン
  pointButton.addEventListener("click", () => {
    console.log("Pointボタンがクリックされました");
    if (pointSelectionContainer.style.display === "none") {
      pointSelectionContainer.style.display = "block";
    } else {
      pointSelectionContainer.style.display = "none";
    }
  });

  // ランドマークボタン
  landmarkButton.addEventListener("click", async () => {
    console.log("ランドマークボタンがクリックされました");
    const urls = ["/data/geoJSON/Point/landmark.geojson"];
    clearGeoJSONLayers(map);
    await loadGeoJSON(map, urls);
    filterState.lastLoadedUrls = urls;
    
    hideFilterContainer();
    
    const schemaFieldsMap = await loadAndMergeSchemas(urls);
    renderFilterFields(filterFormContainer, schemaFieldsMap, filterState.criteria);
  });

  // 公園ボタン
  parkButton.addEventListener("click", async () => {
    console.log("公園ボタンがクリックされました");
    const urls = ["/data/geoJSON/Point/park.geojson"];
    clearGeoJSONLayers(map);
    await loadGeoJSON(map, urls);
    filterState.lastLoadedUrls = urls;
    
    hideFilterContainer();
    
    const schemaFieldsMap = await loadAndMergeSchemas(urls);
    renderFilterFields(filterFormContainer, schemaFieldsMap, filterState.criteria);
  });

  // 避難所ボタン
  shelterButton.addEventListener("click", async () => {
    console.log("避難所ボタンがクリックされました");
    const urls = ["/data/geoJSON/Point/shelter.geojson"];
    clearGeoJSONLayers(map);
    await loadGeoJSON(map, urls);
    filterState.lastLoadedUrls = urls;
    
    showFilterContainer();
    
    const schemaFieldsMap = await loadAndMergeSchemas(urls);
    renderFilterFields(filterFormContainer, schemaFieldsMap, filterState.criteria);
  });

  // 駅ボタン
  stationButton.addEventListener("click", async () => {
    console.log("駅ボタンがクリックされました");
    const urls = ["/data/geoJSON/Point/station.geojson"];
    clearGeoJSONLayers(map);
    await loadGeoJSON(map, urls);
    filterState.lastLoadedUrls = urls;
    
    hideFilterContainer();
    
    const schemaFieldsMap = await loadAndMergeSchemas(urls);
    renderFilterFields(filterFormContainer, schemaFieldsMap, filterState.criteria);
  });

  // すべてのPointボタン
  allPointsButton.addEventListener("click", async () => {
    console.log("すべてのPointボタンがクリックされました");
    clearGeoJSONLayers(map);
    await loadGeoJSON(map, GEOJSON_URLS);
    filterState.lastLoadedUrls = GEOJSON_URLS;
    
    hideFilterContainer();
    
    const schemaFieldsMap = await loadAndMergeSchemas(GEOJSON_URLS);
    renderFilterFields(filterFormContainer, schemaFieldsMap, filterState.criteria);
  });

  // Lineボタン
  lineButton.addEventListener("click", async () => {
    console.log("Lineボタンがクリックされました");
    const urls = ["/data/geoJSON/MultiLineString/railway.geojson"];
    clearGeoJSONLayers(map);
    await loadGeoJSON(map, urls);
    filterState.lastLoadedUrls = urls;
    hideFilterContainer();
  });

  // Multi Lineボタン
  multiLineButton.addEventListener("click", async () => {
    console.log("Multi Lineボタンがクリックされました");
    const urls = [
      "/data/geoJSON/MultiLineString/border.geojson",
      "/data/geoJSON/MultiLineString/emergency_route.geojson",
      "/data/geoJSON/MultiLineString/railway.geojson",
    ];
    clearGeoJSONLayers(map);
    await loadGeoJSON(map, urls);
    filterState.lastLoadedUrls = urls;
    hideFilterContainer();
  });

  // 全てのデータボタン
  allDataButton.addEventListener("click", async () => {
    console.log("全てのデータボタンがクリックされました");
    clearGeoJSONLayers(map);
    await loadGeoJSON(map, GEOJSON_URLS);
    filterState.lastLoadedUrls = GEOJSON_URLS;
    
    hideFilterContainer();
    
    // スキーマを読み込んでフィルターUIを更新
    const schemaFieldsMap = await loadAndMergeSchemas(GEOJSON_URLS);
    renderFilterFields(filterFormContainer, schemaFieldsMap, filterState.criteria);
  });

  // フィルター適用ボタン
  applyFilterBtn.addEventListener("click", async () => {
    console.log("=== フィルター適用ボタンクリック ===");
    
    if (!filterState.lastLoadedUrls || filterState.lastLoadedUrls.length === 0) {
      console.warn("先に表示対象のデータをロードしてください");
      return;
    }
    if (!filterState.schemaFieldsMap || Object.keys(filterState.schemaFieldsMap).length === 0) {
      console.warn("スキーマが読み込まれていません");
      return;
    }

    // 入力値収集
    filterState.criteria = collectCriteriaFromForm(filterFormContainer);
    console.log("収集されたフィルター条件:", filterState.criteria);

    // データ再読み込みとフィルタ適用
    clearGeoJSONLayers(map);
    
    // フィルタリングされたGeoJSONデータを読み込む
    await applyFilterToLeaflet(map, filterState.lastLoadedUrls, filterState.criteria, filterState.schemaFieldsMap);
    
    console.log("=== フィルター適用完了 ===");
  });

  // フィルタークリアボタン
  clearFilterBtn.addEventListener("click", () => {
    filterState.criteria = {};
    renderFilterFields(filterFormContainer, filterState.schemaFieldsMap, filterState.criteria);
    if (filterState.lastLoadedUrls && filterState.lastLoadedUrls.length > 0) {
      clearGeoJSONLayers(map);
      loadGeoJSON(map, filterState.lastLoadedUrls);
    }
  });
}

/**
 * フィルタを適用してLeafletマップにデータを表示
 */
async function applyFilterToLeaflet(map, urls, criteria, schemaFieldsMap) {
  const predicatesMap = buildMultiSchemaPredicates(criteria, schemaFieldsMap);
  
  for (const url of urls) {
    try {
      const dataTypeInfo = getDataTypeInfo(url);
      if (!dataTypeInfo) {
        console.warn(`データ型情報が見つかりません: ${url}`);
        continue;
      }

      const predicate = predicatesMap[dataTypeInfo.dataType];
      if (!predicate) {
        console.warn(`フィルタ関数が見つかりません: ${dataTypeInfo.dataType}`);
        continue;
      }

      const response = await fetch(url);
      const geojsonData = await response.json();

      let visibleCount = 0;
      let hiddenCount = 0;

      // フィーチャーをフィルタリング
      const filteredFeatures = geojsonData.features.filter(feature => {
        const keep = predicate(feature);
        if (keep) {
          visibleCount++;
        } else {
          hiddenCount++;
        }
        return keep;
      });

      // フィルタリングされたデータでGeoJSONレイヤーを作成
      const filteredData = {
        ...geojsonData,
        features: filteredFeatures
      };

      // loadGeoJSONと同じスタイルでレイヤーを作成
      const layer = L.geoJSON(filteredData, {
        pointToLayer: function (feature, latlng) {
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
          return {
            color: getFeatureColor(feature, url),
            weight: 3,
            opacity: 0.7
          };
        },
        onEachFeature: function (feature, layer) {
          if (feature.properties) {
            const popupContent = createPopupContent(feature.properties);
            layer.bindPopup(popupContent);
          }
        }
      });

      layer.addTo(map);

      console.log(`[${dataTypeInfo.dataType}] フィルタ適用完了`);
      console.log(`[${dataTypeInfo.dataType}] 結果 → 表示: ${visibleCount}件, 非表示: ${hiddenCount}件`);
    } catch (e) {
      console.error(`フィルタ適用時のエラー: ${url}`, e);
    }
  }
}

// ヘルパー関数（geojson_loader.jsから複製）
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

