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
} from "plateau/filters/schema";
import {
  renderFilterFields,
  collectCriteriaFromForm,
} from "plateau/filters/filter_form";
import { applyFilterToUrls } from "plateau/filters/filter_logic";
import { loadOsmBuildings } from "plateau/cesium/osm_buildings";

/**
 * UIコントローラーを初期化する
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 */
export function initializeUIController(viewer) {
  // DOM要素の取得
  const pointButton = document.getElementById("point-button");
  const lineButton = document.getElementById("line-button");
  const multiLineButton = document.getElementById("multi-line-button");
  const osmBuildingsButton = document.getElementById("osm-buildings-button");
  const pointSelectionContainer = document.getElementById(
    "point-selection-container"
  );
  const landmarkButton = document.getElementById("landmark-button");
  const parkButton = document.getElementById("park-button");
  const shelterButton = document.getElementById("shelter-button");
  const stationButton = document.getElementById("station-button");
  const allPointsButton = document.getElementById("all-points-button");
  const filterFormContainer = document.getElementById("dynamic-filter-form");
  const applyFilterBtn = document.getElementById("apply-filter-btn");
  const clearFilterBtn = document.getElementById("clear-filter-btn");

  // フィルターUIの状態を保持
  const filterState = {
    schema: null,
    fields: [],
    criteria: {},
    lastLoadedUrls: [],
  };

  // デフォルトスキーマの読み込み（ランドマーク）
  (async () => {
    try {
      const schema = await loadSchema(
        "/data/geoJSON/Point/schema/landmark.schema.geojson"
      );
      const fields = extractPropertyFields(schema);
      filterState.schema = schema;
      filterState.fields = fields;
      renderFilterFields(filterFormContainer, fields, filterState.criteria);
    } catch (e) {
      console.error("スキーマの読み込みに失敗しました", e);
    }
  })();

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
    });
  }

  // ランドマークボタン
  landmarkButton.addEventListener("click", () => {
    console.log("ランドマークボタンがクリックされました");
    clearGeoJSONDataSources(viewer);
    loadGeoJSON(viewer, ["/data/geoJSON/Point/landmark.geojson"]);
    filterState.lastLoadedUrls = ["/data/geoJSON/Point/landmark.geojson"];
  });

  // 公園ボタン
  parkButton.addEventListener("click", () => {
    console.log("公園ボタンがクリックされました");
    clearGeoJSONDataSources(viewer);
    loadGeoJSON(viewer, ["/data/geoJSON/Point/park.geojson"]);
    filterState.lastLoadedUrls = ["/data/geoJSON/Point/park.geojson"];
  });

  // 避難所ボタン
  shelterButton.addEventListener("click", () => {
    console.log("避難所ボタンがクリックされました");
    clearGeoJSONDataSources(viewer);
    loadGeoJSON(viewer, ["/data/geoJSON/Point/shelter.geojson"]);
    filterState.lastLoadedUrls = ["/data/geoJSON/Point/shelter.geojson"];
  });

  // 駅ボタン
  stationButton.addEventListener("click", () => {
    console.log("駅ボタンがクリックされました");
    clearGeoJSONDataSources(viewer);
    loadGeoJSON(viewer, ["/data/geoJSON/Point/station.geojson"]);
    filterState.lastLoadedUrls = ["/data/geoJSON/Point/station.geojson"];
  });

  // すべてのPointボタン
  allPointsButton.addEventListener("click", () => {
    console.log("すべてのPointボタンがクリックされました");
    clearGeoJSONDataSources(viewer);
    loadGeoJSON(viewer, GEOJSON_URLS);
    filterState.lastLoadedUrls = GEOJSON_URLS;
  });

  // フィルター適用ボタン
  applyFilterBtn.addEventListener("click", async () => {
    if (
      !filterState.lastLoadedUrls ||
      filterState.lastLoadedUrls.length === 0
    ) {
      console.warn("先に表示対象のデータをロードしてください");
      return;
    }
    if (!filterState.fields || filterState.fields.length === 0) return;

    // 入力値収集
    filterState.criteria = collectCriteriaFromForm(filterFormContainer);

    // データ再読み込みとフィルタ適用
    clearGeoJSONDataSources(viewer);
    const predicate = buildPredicateFromCriteria(filterState.criteria);
    await applyFilterToUrls(viewer, filterState.lastLoadedUrls, predicate);
  });

  // フィルタークリアボタン
  clearFilterBtn.addEventListener("click", () => {
    filterState.criteria = {};
    renderFilterFields(
      filterFormContainer,
      filterState.fields,
      filterState.criteria
    );
    if (filterState.lastLoadedUrls && filterState.lastLoadedUrls.length > 0) {
      clearGeoJSONDataSources(viewer);
      loadGeoJSON(viewer, filterState.lastLoadedUrls);
    }
  });
}
