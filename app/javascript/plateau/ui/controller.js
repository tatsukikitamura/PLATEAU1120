/**
 * UI操作とイベントリスナーを管理するモジュール
 */
import { loadGeoJSON, GEOJSON_URLS } from "plateau/cesium/geojson_loader";
import { load3DTiles, TILESET_URLS } from "plateau/cesium/tiles_loader";
import { clearGeoJSONDataSources } from "plateau/utils/data_manager";
import {
  loadSchema,
  extractPropertyFields,
  buildMultiSchemaPredicates,
} from "plateau/filters/schema";
import {
  renderFilterFields,
  collectCriteriaFromForm,
} from "plateau/filters/filter_form";
import { applyMultiDataTypeFilter } from "plateau/filters/filter_logic";
import { loadOsmBuildings } from "plateau/cesium/osm_buildings";
import { 
  DATA_TYPE_MAPPING, 
  getDataTypeInfo, 
  filterUrlsWithSchema,
  groupUrlsByDataType 
} from "plateau/filters/data_type_mapping";
import {
  loadGoogleMapsPlaces,
  loadGoogleMapsDirections,
  loadGoogleMapsGeocode,
  clearGoogleMapsData,
  toggleGoogleMapsData
} from "plateau/cesium/google_maps_loader";

/**
 * UIコントローラーを初期化する
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 */
export function initializeUIController(viewer) {
  // DOM要素の取得
  const pointButton = document.getElementById("point-button");
  const lineButton = document.getElementById("line-button");
  const multiLineButton = document.getElementById("multi-line-button");
  const googleapiButton = document.getElementById("googleapi-button");
  const allDataButton = document.getElementById("all-data-button");
  const osmBuildingsButton = document.getElementById("osm-buildings-button");
  const homeButton = document.getElementById("home-button");
  const pointSelectionContainer = document.getElementById(
    "point-selection-container"
  );
  const googleapiContainer = document.getElementById("googleapi-container");
  const landmarkButton = document.getElementById("landmark-button");
  const parkButton = document.getElementById("park-button");
  const shelterButton = document.getElementById("shelter-button");
  const stationButton = document.getElementById("station-button");
  const allPointsButton = document.getElementById("all-points-button");
  const filterToggleBtn = document.getElementById("filter-toggle-btn");
  const filterFormContainer = document.getElementById("dynamic-filter-form");
  const applyFilterBtn = document.getElementById("apply-filter-btn");
  const clearFilterBtn = document.getElementById("clear-filter-btn");
  
  // ナビ関連のDOM要素
  const navToggleBtn = document.getElementById("nav-toggle-btn");
  const navContainer = document.getElementById("nav-container");
  const placesSearchBtn = document.getElementById("places-search-btn");
  const directionsBtn = document.getElementById("directions-btn");
  const geocodeBtn = document.getElementById("geocode-btn");
  const clearNavBtn = document.getElementById("clear-nav-btn");

  // フィルターUIの状態を保持（複数スキーマ対応）
  const filterState = {
    schemas: {}, // データ型別のスキーマ
    schemaFieldsMap: {}, // データ型別のフィールド定義
    criteria: {},
    lastLoadedUrls: [],
  };

  // フィルターコンテナの取得と初期状態設定
  const filterContainer = document.getElementById("filter-container");
  if (filterContainer) {
    filterContainer.style.display = "none"; // 初期状態で非表示
  }
  
  // ナビコンテナの取得と初期状態設定
  if (navContainer) {
    navContainer.style.display = "none"; // 初期状態で非表示
  }
  
  // GoogleAPIコンテナの取得と初期状態設定
  if (googleapiContainer) {
    googleapiContainer.style.display = "none"; // 初期状態で非表示
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
  
  // ナビコンテナの表示/非表示を制御する関数
  const showNavContainer = () => {
    if (navContainer) {
      navContainer.style.display = "block";
    }
  };

  const hideNavContainer = () => {
    if (navContainer) {
      navContainer.style.display = "none";
    }
  };
  
  // GoogleAPIコンテナの表示/非表示を制御する関数
  const showGoogleapiContainer = () => {
    if (googleapiContainer) {
      googleapiContainer.style.display = "block";
    }
  };

  const hideGoogleapiContainer = () => {
    if (googleapiContainer) {
      googleapiContainer.style.display = "none";
    }
  };

  // フィルターボタンのクリックイベント
  if (filterToggleBtn) {
    filterToggleBtn.addEventListener("click", () => {
      console.log("フィルターボタンがクリックされました");
      if (filterContainer && filterContainer.style.display === "none") {
        showFilterContainer();
        hideNavContainer(); // ナビコンテナを非表示
        hideGoogleapiContainer(); // GoogleAPIコンテナを非表示
      } else {
        hideFilterContainer();
      }
    });
  }
  
  // ナビボタンのクリックイベント
  if (navToggleBtn) {
    navToggleBtn.addEventListener("click", () => {
      console.log("ナビボタンがクリックされました");
      if (navContainer && navContainer.style.display === "none") {
        showNavContainer();
        hideFilterContainer(); // フィルターコンテナを非表示
        hideGoogleapiContainer(); // GoogleAPIコンテナを非表示
      } else {
        hideNavContainer();
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

  // 共通のデータロード処理を関数化
  async function loadDataAndUpdateFilter(viewer, urls, buttonName) {
    console.log(`${buttonName}ボタンがクリックされました`);
    clearGeoJSONDataSources(viewer);
    await loadGeoJSON(viewer, urls);
    filterState.lastLoadedUrls = urls;
    
    hideFilterContainer();
    
    // スキーマを読み込んでフィルターUIを更新
    const schemaFieldsMap = await loadAndMergeSchemas(urls);
    renderFilterFields(filterFormContainer, schemaFieldsMap, filterState.criteria);
  }

  // Pointボタン: Point選択メニューの表示/非表示
  pointButton.addEventListener("click", () => {
    console.log("Pointボタンがクリックされました");
    if (pointSelectionContainer.style.display === "none") {
      pointSelectionContainer.style.display = "block";
      hideGoogleapiContainer(); // GoogleAPIコンテナを非表示
    } else {
      pointSelectionContainer.style.display = "none";
    }
  });
  
  // GoogleAPIボタン: GoogleAPI検索メニューの表示/非表示
  if (googleapiButton) {
    googleapiButton.addEventListener("click", () => {
      console.log("GoogleAPIボタンがクリックされました");
      if (googleapiContainer.style.display === "none") {
        googleapiContainer.style.display = "block";
        hideFilterContainer(); // フィルターコンテナを非表示
        hideNavContainer(); // ナビコンテナを非表示
        pointSelectionContainer.style.display = "none"; // Point選択コンテナを非表示
      } else {
        googleapiContainer.style.display = "none";
      }
    });
  }

  // Lineボタン: 3D Tilesの読み込み
  lineButton.addEventListener("click", () => {
    console.log("Lineボタンがクリックされました");
    load3DTiles(viewer, TILESET_URLS);
    hideFilterContainer();
    hideGoogleapiContainer();
  });

  // Multi Lineボタン: MultiLineStringデータのみロード
  multiLineButton.addEventListener("click", () => {
    console.log("Multi Lineボタンがクリックされました");
    clearGeoJSONDataSources(viewer);
    const multiLineUrls = GEOJSON_URLS.filter((url) =>
      url.includes("MultiLineString")
    );
    loadGeoJSON(viewer, multiLineUrls);
    filterState.lastLoadedUrls = multiLineUrls;
    hideFilterContainer();
    hideGoogleapiContainer();
  });

  // OSM Buildingsボタン: 一度だけロード
  let osmLoaded = false;
  if (osmBuildingsButton) {
    osmBuildingsButton.addEventListener("click", async () => {
      if (osmLoaded) {
        console.log("OSM Buildingsはすでにロード済みです");
        return;
      }
      await loadOsmBuildings(viewer);
      osmLoaded = true;
      hideFilterContainer();
      hideGoogleapiContainer();
    });
  }

  // ランドマークボタン
  landmarkButton.addEventListener("click", () => 
    loadDataAndUpdateFilter(viewer, ["/data/geoJSON/Point/landmark.geojson"], "ランドマーク")
  );

  // 公園ボタン
  parkButton.addEventListener("click", () => 
    loadDataAndUpdateFilter(viewer, ["/data/geoJSON/Point/park.geojson"], "公園")
  );

  // 避難所ボタン
  shelterButton.addEventListener("click", () => 
    loadDataAndUpdateFilter(viewer, ["/data/geoJSON/Point/shelter.geojson"], "避難所")
  );

  // 駅ボタン
  stationButton.addEventListener("click", () => 
    loadDataAndUpdateFilter(viewer, ["/data/geoJSON/Point/station.geojson"], "駅")
  );

  // すべてのPointボタン
  allPointsButton.addEventListener("click", () => 
    loadDataAndUpdateFilter(viewer, GEOJSON_URLS, "すべてのPoint")
  );

  // 全てのデータボタン
  if (allDataButton) {
    allDataButton.addEventListener("click", () => {
      loadDataAndUpdateFilter(viewer, GEOJSON_URLS, "全てのデータ");
      hideGoogleapiContainer();
    });
  }

  // ホームボタン
  if (homeButton) {
    homeButton.addEventListener("click", () => {
      window.location.href = "/";
    });
  }

  // フィルター適用ボタン
  applyFilterBtn.addEventListener("click", async () => {
    if (
      !filterState.lastLoadedUrls ||
      filterState.lastLoadedUrls.length === 0
    ) {
      console.warn("先に表示対象のデータをロードしてください");
      return;
    }
    if (!filterState.schemaFieldsMap || Object.keys(filterState.schemaFieldsMap).length === 0) {
      console.warn("スキーマが読み込まれていません");
      return;
    }

    console.log("=== フィルター適用ボタンクリック ===");
    
    // 入力値収集
    filterState.criteria = collectCriteriaFromForm(filterFormContainer);
    console.log("収集されたフィルター条件:", filterState.criteria);

    // データ再読み込みとフィルタ適用
    clearGeoJSONDataSources(viewer);
    
    // 複数データ型に対応したフィルタ適用
    const predicatesMap = buildMultiSchemaPredicates(filterState.criteria, filterState.schemaFieldsMap);
    console.log("生成されたpredicates:", Object.keys(predicatesMap));
    
    await applyMultiDataTypeFilter(viewer, filterState.lastLoadedUrls, predicatesMap, DATA_TYPE_MAPPING);
    
    console.log("=== フィルター適用完了 ===");
  });

  // フィルタークリアボタン
  clearFilterBtn.addEventListener("click", () => {
    filterState.criteria = {};
    renderFilterFields(
      filterFormContainer,
      filterState.schemaFieldsMap,
      filterState.criteria
    );
    if (filterState.lastLoadedUrls && filterState.lastLoadedUrls.length > 0) {
      clearGeoJSONDataSources(viewer);
      loadGeoJSON(viewer, filterState.lastLoadedUrls);
    }
  });
  
  // Google Maps Places検索ボタン
  if (placesSearchBtn) {
    placesSearchBtn.addEventListener("click", async () => {
      const queryInput = document.getElementById("places-query-input");
      const locationInput = document.getElementById("places-location-input");
      const radiusInput = document.getElementById("places-radius-input");
      const typeInput = document.getElementById("places-type-input");
      
      if (!queryInput || !queryInput.value.trim()) {
        alert("検索クエリを入力してください");
        return;
      }
      
      const searchParams = {
        query: queryInput.value.trim(),
        radius: radiusInput ? parseInt(radiusInput.value) || 5000 : 5000,
        type: typeInput ? typeInput.value : null
      };
      
      // 位置情報の処理
      if (locationInput && locationInput.value.trim()) {
        searchParams.location = locationInput.value.trim();
      }
      
      try {
        await loadGoogleMapsPlaces(viewer, searchParams, {
          stroke: Cesium.Color.HOTPINK,
          fill: Cesium.Color.PINK,
          markerSymbol: '🍽️'
        });
      } catch (error) {
        console.error("Places検索エラー:", error);
        alert("Places検索に失敗しました: " + error.message);
      }
    });
  }
  
  // Google Maps Directionsボタン
  if (directionsBtn) {
    directionsBtn.addEventListener("click", async () => {
      const originInput = document.getElementById("directions-origin-input");
      const destinationInput = document.getElementById("directions-destination-input");
      const modeInput = document.getElementById("directions-mode-input");
      
      if (!originInput || !originInput.value.trim() || !destinationInput || !destinationInput.value.trim()) {
        alert("出発地と目的地を入力してください");
        return;
      }
      
      const routeParams = {
        origin: originInput.value.trim(),
        destination: destinationInput.value.trim(),
        mode: modeInput ? modeInput.value : 'driving'
      };
      
      try {
        await loadGoogleMapsDirections(viewer, routeParams, {
          stroke: Cesium.Color.YELLOW,
          strokeWidth: 4
        });
      } catch (error) {
        console.error("Directions検索エラー:", error);
        alert("ルート検索に失敗しました: " + error.message);
      }
    });
  }
  
  // Google Maps Geocodingボタン
  if (geocodeBtn) {
    geocodeBtn.addEventListener("click", async () => {
      const addressInput = document.getElementById("geocode-address-input");
      
      if (!addressInput || !addressInput.value.trim()) {
        alert("住所を入力してください");
        return;
      }
      
      try {
        await loadGoogleMapsGeocode(viewer, addressInput.value.trim(), {
          stroke: Cesium.Color.BLUE,
          fill: Cesium.Color.LIGHTBLUE,
          markerSymbol: '📍'
        });
      } catch (error) {
        console.error("Geocoding検索エラー:", error);
        alert("住所検索に失敗しました: " + error.message);
      }
    });
  }
  
  // ナビデータクリアボタン
  if (clearNavBtn) {
    clearNavBtn.addEventListener("click", () => {
      clearGoogleMapsData(viewer);
      console.log("ナビデータをクリアしました");
    });
  }
}
