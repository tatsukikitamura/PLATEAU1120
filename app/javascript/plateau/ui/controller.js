/**
 * UI操作とイベントリスナーを管理するモジュール
 */
import { loadGeoJSON, GEOJSON_URLS } from "plateau/cesium/geojson_loader";
import { load3DTiles, TILESET_URLS } from "plateau/cesium/tiles_loader";
import { clearGeoJSONDataSources } from "plateau/utils/data_manager";
import {
  loadSchema,
  extractPropertyFields,
  buildPredicateFromCriteria,
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

/**
 * UIコントローラーを初期化する
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 */
export function initializeUIController(viewer) {
  // DOM要素の取得
  const pointButton = document.getElementById("point-button");
  const lineButton = document.getElementById("line-button");
  const multiLineButton = document.getElementById("multi-line-button");
  const allDataButton = document.getElementById("all-data-button");
  const osmBuildingsButton = document.getElementById("osm-buildings-button");
  const homeButton = document.getElementById("home-button");
  const pointSelectionContainer = document.getElementById(
    "point-selection-container"
  );
  const landmarkButton = document.getElementById("landmark-button");
  const parkButton = document.getElementById("park-button");
  const shelterButton = document.getElementById("shelter-button");
  const stationButton = document.getElementById("station-button");
  const allPointsButton = document.getElementById("all-points-button");
  const filterToggleBtn = document.getElementById("filter-toggle-btn");
  const filterFormContainer = document.getElementById("dynamic-filter-form");
  const applyFilterBtn = document.getElementById("apply-filter-btn");
  const clearFilterBtn = document.getElementById("clear-filter-btn");

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
    } else {
      pointSelectionContainer.style.display = "none";
    }
  });

  // Lineボタン: 3D Tilesの読み込み
  lineButton.addEventListener("click", () => {
    console.log("Lineボタンがクリックされました");
    load3DTiles(viewer, TILESET_URLS);
    hideFilterContainer();
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
    allDataButton.addEventListener("click", () => 
      loadDataAndUpdateFilter(viewer, GEOJSON_URLS, "全てのデータ")
    );
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
}
