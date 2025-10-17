/**
 * UI操作とイベントリスナーを管理するモジュール
 */
import { loadGeoJSON, geourls } from 'geojsonLoader';
import { load3dTile, urls } from '3dtile';
import { clearGeoJSONDataSources } from 'dataManager';
import { loadSchema, extractPropertyFields, buildPredicateFromCriteria } from 'schema';
import { renderFilterFields, collectCriteriaFromForm, applyFilterToUrls } from 'geojson';

/**
 * UIコントローラーを初期化する関数
 * @param {Cesium.Viewer} viewer - Cesiumのビューアーインスタンス
 */
export function initializeUIController(viewer) {
  // DOM要素の取得
  const pointButton = document.getElementById('point-button');
  const lineButton = document.getElementById('line-button');
  const multiLineButton = document.getElementById('multi-line-button');
  const pointSelectionContainer = document.getElementById('point-selection-container');
  const landmarkButton = document.getElementById('landmark-button');
  const parkButton = document.getElementById('park-button');
  const shelterButton = document.getElementById('shelter-button');
  const stationButton = document.getElementById('station-button');
  const allPointsButton = document.getElementById('all-points-button');
  const filterFormContainer = document.getElementById('dynamic-filter-form');
  const applyFilterBtn = document.getElementById('apply-filter-btn');
  const clearFilterBtn = document.getElementById('clear-filter-btn');

  // フィルターUIの状態を保持
  const filterState = {
    schema: null,
    fields: [],
    criteria: {},
    lastLoadedUrls: []
  };

  // デフォルトはランドマークのスキーマを読む（必要に応じて切り替え可）
  (async () => {
    try {
      const schema = await loadSchema('/data/geoJSON/Point/schema/landmark.shema.geojson');
      const fields = extractPropertyFields(schema);
      filterState.schema = schema;
      filterState.fields = fields;
      renderFilterFields(filterFormContainer, fields, filterState.criteria);
    } catch (e) {
      console.error('スキーマの読み込みに失敗しました', e);
    }
  })();

  // Pointボタンのイベントリスナー
  pointButton.addEventListener('click', () => {
    console.log('Pointボタンがクリックされました');
    // Point選択コンテナの表示/非表示を切り替え
    if (pointSelectionContainer.style.display === 'none') {
      pointSelectionContainer.style.display = 'block';
    } else {
      pointSelectionContainer.style.display = 'none';
    }
  });

  // Lineボタンのイベントリスナー
  lineButton.addEventListener('click', () => {
    console.log('Lineボタンがクリックされました');
    load3dTile(viewer, urls);
  });

  // Multi Lineボタンのイベントリスナー（MultiLineStringのみロード）
  multiLineButton.addEventListener('click', () => {
    console.log('Multi Lineボタンがクリックされました');
    clearGeoJSONDataSources(viewer);
    const multiLineUrls = geourls.filter(url => url.includes('MultiLineString'));
    loadGeoJSON(viewer, multiLineUrls);
    filterState.lastLoadedUrls = multiLineUrls;
  });

  // Pointデータ選択ボタンのイベントリスナー
  landmarkButton.addEventListener('click', () => {
    console.log('ランドマークボタンがクリックされました');
    clearGeoJSONDataSources(viewer);
    loadGeoJSON(viewer, ['/data/geoJSON/Point/landmark.geojson']);
    filterState.lastLoadedUrls = ['/data/geoJSON/Point/landmark.geojson'];
  });

  parkButton.addEventListener('click', () => {
    console.log('公園ボタンがクリックされました');
    clearGeoJSONDataSources(viewer);
    loadGeoJSON(viewer, ['/data/geoJSON/Point/park.geojson']);
    filterState.lastLoadedUrls = ['/data/geoJSON/Point/park.geojson'];
  });

  shelterButton.addEventListener('click', () => {
    console.log('避難所ボタンがクリックされました');
    clearGeoJSONDataSources(viewer);
    loadGeoJSON(viewer, ['/data/geoJSON/Point/shelter.geojson']);
    filterState.lastLoadedUrls = ['/data/geoJSON/Point/shelter.geojson'];
  });

  stationButton.addEventListener('click', () => {
    console.log('駅ボタンがクリックされました');
    clearGeoJSONDataSources(viewer);
    loadGeoJSON(viewer, ['/data/geoJSON/Point/station.geojson']);
    filterState.lastLoadedUrls = ['/data/geoJSON/Point/station.geojson'];
  });

  allPointsButton.addEventListener('click', () => {
    console.log('すべてのPointボタンがクリックされました');
    clearGeoJSONDataSources(viewer);
    loadGeoJSON(viewer, geourls);
    filterState.lastLoadedUrls = geourls;
  });

  // フィルター適用
  applyFilterBtn.addEventListener('click', async () => {
    if (!filterState.lastLoadedUrls || filterState.lastLoadedUrls.length === 0) {
      console.warn('先に表示対象のデータをロードしてください');
      return;
    }
    if (!filterState.fields || filterState.fields.length === 0) return;

    // 入力値収集
    filterState.criteria = collectCriteriaFromForm(filterFormContainer);

    // データ再読み込みとフィルタ
    clearGeoJSONDataSources(viewer);
    const predicate = buildPredicateFromCriteria(filterState.criteria);
    await applyFilterToUrls(viewer, filterState.lastLoadedUrls, predicate);
  });

  // フィルタークリア
  clearFilterBtn.addEventListener('click', () => {
    filterState.criteria = {};
    renderFilterFields(filterFormContainer, filterState.fields, filterState.criteria);
    if (filterState.lastLoadedUrls && filterState.lastLoadedUrls.length > 0) {
      clearGeoJSONDataSources(viewer);
      loadGeoJSON(viewer, filterState.lastLoadedUrls);
    }
  });
}

/**
 * スキーマフィールドからUIを生成
 * @param {HTMLElement} container
 * @param {Array<{key:string,type:string,enum?:string[]}>} fields
 * @param {Object} criteria
 */
// フィルターUI生成・criteria収集は filters/geojson.js へ移動
