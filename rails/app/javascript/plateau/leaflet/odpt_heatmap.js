let currentLayer = null;

function valueToColor(value, maxValue) {
  if (!maxValue || maxValue <= 0) return '#2c7fb8';
  const t = Math.max(0, Math.min(1, value / maxValue));
  // simple blue -> red ramp
  const r = Math.round(255 * t);
  const g = Math.round(80 * (1 - t));
  const b = Math.round(200 * (1 - t));
  return `rgb(${r},${g},${b})`;
}

export async function loadOdptHeatmap(map, { timeSlot = 'noon', year, operator } = {}) {
  try {
    const params = new URLSearchParams();
    if (timeSlot) params.set('time_slot', timeSlot);
    if (year) params.set('year', String(year));
    if (operator) params.set('operator', operator);
    const res = await fetch(`/api/odpt/passenger_heatmap?${params.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'failed');
    const data = json.data || [];

    if (currentLayer) {
      map.removeLayer(currentLayer);
      currentLayer = null;
    }

    const maxVal = data.reduce((m, d) => Math.max(m, d.value || 0), 0);

    currentLayer = L.layerGroup();
    data.forEach(d => {
      if (!d.lat || !d.lon) return;
      const val = d.value || 0;
      const radius = Math.max(50, Math.min(400, (val / (maxVal || 1)) * 400));
      const color = valueToColor(val, maxVal);
      const circle = L.circle([d.lat, d.lon], {
        radius: radius,
        color: '#ffffff',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.6
      }).bindPopup(`<strong>${d.title || ''}</strong><br>value: ${val.toLocaleString()}`);
      circle.addTo(currentLayer);
    });

    currentLayer.addTo(map);
  } catch (e) {
    console.error('ODPT heatmap load error', e);
  }
}


