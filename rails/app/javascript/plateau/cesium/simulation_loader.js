/**
 * 避難シミュレーション結果のCesium表示（スタブ）
 */

export async function runAndLoadEvacuationSimulation(viewer, params = {}) {
  try {
    const response = await fetch('/api/simulation/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Simulation failed');

    const Cesium = window.Cesium;
    // GeoJSONデータをCesiumで読み込み
    const dataSource = await Cesium.GeoJsonDataSource.load(data.geojson, {
      clampToGround: true
    });
    dataSource._name = `Simulation_Evacuation_Tsunami_${Date.now()}`;
    viewer.dataSources.add(dataSource);

    if (data.geojson.features && data.geojson.features.length > 0) {
      viewer.flyTo(dataSource);
    }

    return { dataSource, geojson: data.geojson, metadata: data.metadata };
  } catch (e) {
    console.error('simulation load error:', e);
    throw e;
  }
}


