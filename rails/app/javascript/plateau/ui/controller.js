/**
 * UI操作とイベントリスナーを管理するモジュール
 */
import {
  loadGeoJSON,
  GEOJSON_URLS,
  load3DTiles,
  TILESET_URLS,
  loadOsmBuildings,
  loadGoogleMapsPlaces,
  loadGoogleMapsDirections,
  loadGoogleMapsGeocode,
  clearGoogleMapsData,
  toggleGoogleMapsData,
} from "plateau/cesium";
import {
  loadSchema,
  extractPropertyFields,
  buildMultiSchemaPredicates,
  renderFilterFields,
  collectCriteriaFromForm,
  applyMultiDataTypeFilter,
  DATA_TYPE_MAPPING,
  getDataTypeInfo,
  filterUrlsWithSchema,
  groupUrlsByDataType,
} from "plateau/filters";
import { clearGeoJSONDataSources } from "plateau/utils";

/**
 * UIコントローラーを初期化する
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 */
export default class UIController{
  constructor(viewer){
    this.viewer = viewer;
    this.osmLoaded = false;
    this.filterState = {
      schemas: {},
      schemaFieldsMap: {},
      criteria: {},
      lastLoadedUrls: [],
    };
    this.pointButton = document.getElementById("point-button");
    this.lineButton = document.getElementById("line-button");
    this.multiLineButton = document.getElementById("multi-line-button");
    this.googleapiButton = document.getElementById("googleapi-button");
    this.allDataButton = document.getElementById("all-data-button");
    this.osmBuildingsButton = document.getElementById("osm-buildings-button");
    this.homeButton = document.getElementById("home-button");
    this.pointSelectionContainer = document.getElementById("point-selection-container");
    this.googleapiContainer = document.getElementById("googleapi-container");
    this.landmarkButton = document.getElementById("landmark-button");
    this.parkButton = document.getElementById("park-button");
    this.shelterButton = document.getElementById("shelter-button");
    this.stationButton = document.getElementById("station-button");
    this.allPointsButton = document.getElementById("all-points-button");
    this.filterToggleBtn = document.getElementById("filter-toggle-btn");
    this.filterFormContainer = document.getElementById("dynamic-filter-form");
    this.applyFilterBtn = document.getElementById("apply-filter-btn");
    this.clearFilterBtn = document.getElementById("clear-filter-btn");
    this.navToggleBtn = document.getElementById("nav-toggle-btn");
    this.navContainer = document.getElementById("nav-container");
    this.placesSearchBtn = document.getElementById("places-search-btn");
    this.directionsBtn = document.getElementById("directions-btn");
    this.geocodeBtn = document.getElementById("geocode-btn");
    this.clearNavBtn = document.getElementById("clear-nav-btn");
    this.filterContainer = document.getElementById("filter-container");
    this.googleapiContainer = document.getElementById("googleapi-container");
    this.hideFilterContainer();
    this.hideNavContainer();
    this.hideGoogleapiContainer();
    this.hidePointSelectionContainer();
    this.bindEvents();
  }

  showFilterContainer(){
    if (this.filterContainer) {
      this.filterContainer.style.display = "block";
    }
  };hideFilterContainer(){
    if (this.filterContainer) {
      this.filterContainer.style.display = "none";
    }
  }

  // フィルターコンテナの表示/非表示を制御する関数
  
  // ナビコンテナの表示/非表示を制御する関数
  showNavContainer(){
    if (this.navContainer) {
      this.navContainer.style.display = "block";
    }
  };
  hideNavContainer(){
    if (this.navContainer) {
      this.navContainer.style.display = "none";
    }
  };
  
  // GoogleAPIコンテナの表示/非表示を制御する関数
  showGoogleapiContainer(){
    if (this.googleapiContainer) {
      this.googleapiContainer.style.display = "block";
    }
  };
  hideGoogleapiContainer(){
    if (this.googleapiContainer) {
      this.googleapiContainer.style.display = "none";
    }
  }

  showPointSelectionContainer(){
    if (this.pointSelectionContainer) {
      this.pointSelectionContainer.style.display = "block";
    }
  };
  hidePointSelectionContainer(){
    if (this.pointSelectionContainer) {
      this.pointSelectionContainer.style.display = "none";
    }
  }

  // 複数スキーマの読み込みとフィールド統合
  async loadAndMergeSchemas(urls) {
    const schemaUrls = filterUrlsWithSchema(urls);
    const schemaFieldsMap = {};
    
    for (const url of schemaUrls) {
      const dataTypeInfo = getDataTypeInfo(url);
      if (dataTypeInfo && dataTypeInfo.schemaPath) {
        try {
          const schema = await loadSchema(dataTypeInfo.schemaPath);
          const fields = extractPropertyFields(schema);
          schemaFieldsMap[dataTypeInfo.dataType] = fields;
          this.filterState.schemas[dataTypeInfo.dataType] = schema;
          console.log(`スキーマ読み込み完了: ${dataTypeInfo.dataType}`);
        } catch (e) {
          console.error(`スキーマ読み込みエラー (${dataTypeInfo.dataType}):`, e);
        }
      }
    }
    
    this.filterState.schemaFieldsMap = schemaFieldsMap;
    return schemaFieldsMap;
  }

  // 共通のデータロード処理を関数化
  async loadDataAndUpdateFilter(urls, buttonName) {
    console.log(`${buttonName}ボタンがクリックされました`);
    clearGeoJSONDataSources(this.viewer);
    await loadGeoJSON(this.viewer, urls);
    this.filterState.lastLoadedUrls = urls;
    
    this.hideFilterContainer();
    
    // スキーマを読み込んでフィルターUIを更新
    const schemaFieldsMap = await this.loadAndMergeSchemas(urls);
    renderFilterFields(this.filterFormContainer, schemaFieldsMap, this.filterState.criteria);
  }

  bindEvents(){
    if (this.navToggleBtn) {
      this.navToggleBtn.addEventListener("click", () => {
        console.log("ナビボタンがクリックされました");
        if (this.navContainer && this.navContainer.style.display === "none") {
          this.showNavContainer();
          this.hideFilterContainer(); // フィルターコンテナを非表示
          this.hideGoogleapiContainer(); // GoogleAPIコンテナを非表示
        } else {
          this.hideNavContainer();
        }
      }); 
    }
    if (this.pointButton) {
      this.pointButton.addEventListener("click", () => {
        console.log("Pointボタンがクリックされました");
        if (this.pointSelectionContainer.style.display === "none") {
          this.showPointSelectionContainer();        
          this.hideGoogleapiContainer(); // GoogleAPIコンテナを非表示
        } else {
          this.hidePointSelectionContainer();
          this.hideGoogleapiContainer(); // GoogleAPIコンテナを非表示
        }
      });
    }
    if (this.lineButton) {
      this.lineButton.addEventListener("click", () => {
        console.log("Lineボタンがクリックされました");
        load3DTiles(this.viewer, TILESET_URLS);
        this.hideFilterContainer();
        this.hideNavContainer();
      });
    }
    if (this.multiLineButton) {
      this.multiLineButton.addEventListener("click", () => {
        console.log("Multi Lineボタンがクリックされました");
        clearGeoJSONDataSources(this.viewer);
        const multiLineUrls = GEOJSON_URLS.filter((url) =>
          url.includes("MultiLineString")
        );
      });
    }
    if (this.googleapiButton) {
      this.googleapiButton.addEventListener("click", () => {
        console.log("GoogleAPIボタンがクリックされました");
        if (this.googleapiContainer.style.display === "none") {
          this.showGoogleapiContainer();
          this.hideFilterContainer();
          this.hideNavContainer();
        } else {
          this.hideGoogleapiContainer();
        }
      });
    }
    if (this.osmBuildingsButton) {
    this.osmBuildingsButton.addEventListener("click", async () => {
        console.log("OSM Buildingsボタンがクリックされました");
        if (this.osmLoaded) {
          console.log("OSM Buildingsはすでにロード済みです");
          return;
        }
        await loadOsmBuildings(this.viewer);
        this.osmLoaded = true;
        this.hideFilterContainer();
        this.hideGoogleapiContainer();
      });
    }

    // すべてのPointボタン
    if (this.allPointsButton) {
      this.allPointsButton.addEventListener("click", () => {
        this.loadDataAndUpdateFilter(GEOJSON_URLS, "すべてのPoint");
        this.hideGoogleapiContainer(  );
      });
    }

    // 全てのデータボタン
   if (this.allDataButton) {
      this.allDataButton.addEventListener("click", () => {
        this.loadDataAndUpdateFilter(GEOJSON_URLS, "全てのデータ");
          this.hideGoogleapiContainer();
        });
      }
    

    // ホームボタン
    if (this.homeButton) {
      this.homeButton.addEventListener("click", () => {
        window.location.href = "/";
        });
      }
    

  // フィルター適用ボタン
    this.applyFilterBtn.addEventListener("click", async () => {
      if (
        !this.filterState.lastLoadedUrls ||
      this.filterState.lastLoadedUrls.length === 0
    ) {
      console.warn("先に表示対象のデータをロードしてください");
      return;
    }
    if (!this.filterState.schemaFieldsMap || Object.keys(this.filterState.schemaFieldsMap).length === 0) {
      console.warn("スキーマが読み込まれていません");
      return;
    }

    console.log("=== フィルター適用ボタンクリック ===");
    
    // 入力値収集
    this.filterState.criteria = collectCriteriaFromForm(this.filterFormContainer);
    console.log("収集されたフィルター条件:", this.filterState.criteria);

    // データ再読み込みとフィルタ適用
    clearGeoJSONDataSources(this.viewer);
    
    // 複数データ型に対応したフィルタ適用
    const predicatesMap = buildMultiSchemaPredicates(this.filterState.criteria, this.filterState.schemaFieldsMap);
    console.log("生成されたpredicates:", Object.keys(predicatesMap));
    
    await applyMultiDataTypeFilter(this.viewer, this.filterState.lastLoadedUrls, predicatesMap, DATA_TYPE_MAPPING);
    
    console.log("=== フィルター適用完了 ===");
  });

  // フィルタークリアボタン
  this.clearFilterBtn.addEventListener("click", () => {
    this.filterState.criteria = {};
    renderFilterFields(
      this.filterFormContainer,
      this.filterState.schemaFieldsMap,
      this.filterState.criteria
    );
    if (this.filterState.lastLoadedUrls && this.filterState.lastLoadedUrls.length > 0) {
      clearGeoJSONDataSources(this.viewer);
      loadGeoJSON(this.viewer, this.filterState.lastLoadedUrls);
    }
  });
  
  // Google Maps Places検索ボタン
  if (this.placesSearchBtn) {
    this.placesSearchBtn.addEventListener("click", async () => {
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
        await loadGoogleMapsPlaces(this.viewer, searchParams, {
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
  if (this.directionsBtn) {
    this.directionsBtn.addEventListener("click", async () => {
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
        await loadGoogleMapsDirections(this.viewer, routeParams, {
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
  if (this.geocodeBtn) {
    this.geocodeBtn.addEventListener("click", async () => {
      const addressInput = document.getElementById("geocode-address-input");
      
      if (!addressInput || !addressInput.value.trim()) {
        alert("住所を入力してください");
        return;
      }
      
      try {
        await loadGoogleMapsGeocode(this.viewer, addressInput.value.trim(), {
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
  if (this.clearNavBtn) {
    this.clearNavBtn.addEventListener("click", () => {
      clearGoogleMapsData(this.viewer);
      console.log("ナビデータをクリアしました");
    });
  }
}
}
