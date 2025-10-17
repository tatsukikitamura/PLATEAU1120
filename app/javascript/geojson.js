export function filterGeoJSON(collection, predicate) {
  if (Array.isArray(collection)) {
    return collection.filter(predicate);
  }
  if (collection && typeof collection === 'object' && Array.isArray(collection.features)) {
    return { ...collection, features: collection.features.filter(predicate) };
  }
  return collection;
}

/**
 * スキーマフィールドからUIを生成
 * @param {HTMLElement} container
 * @param {Array<{key:string,type:string,enum?:string[]}>} fields
 * @param {Object} criteria
 */
export function renderFilterFields(container, fields, criteria) {
  if (!container) return;
  container.innerHTML = '';
  for (const field of fields) {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '8px';
    const label = document.createElement('label');
    label.textContent = field.key;
    label.style.display = 'block';
    label.style.fontWeight = 'bold';
    wrapper.appendChild(label);

    if (field.enum && Array.isArray(field.enum)) {
      const box = document.createElement('div');
      for (const opt of field.enum) {
        const id = `f_${field.key}_${opt}`;
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id;
        cb.name = field.key;
        cb.value = opt;
        cb.checked = Array.isArray(criteria[field.key]) ? criteria[field.key].includes(opt) : false;
        const l = document.createElement('label');
        l.htmlFor = id;
        l.textContent = opt;
        l.style.marginRight = '8px';
        box.appendChild(cb);
        box.appendChild(l);
      }
      wrapper.appendChild(box);
    } else if (field.type === 'number') {
      const min = document.createElement('input');
      min.type = 'number';
      min.placeholder = 'min';
      min.value = criteria[field.key]?.min ?? '';
      min.style.width = '45%';
      const max = document.createElement('input');
      max.type = 'number';
      max.placeholder = 'max';
      max.value = criteria[field.key]?.max ?? '';
      max.style.width = '45%';
      max.style.marginLeft = '6px';
      min.dataset.role = 'min';
      max.dataset.role = 'max';
      min.dataset.key = field.key;
      max.dataset.key = field.key;
      wrapper.appendChild(min);
      wrapper.appendChild(max);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `${field.key} を含む...`;
      input.value = criteria[field.key] ?? '';
      input.dataset.key = field.key;
      wrapper.appendChild(input);
    }

    container.appendChild(wrapper);
  }
}

/**
 * 入力フォームからcriteriaを収集
 * @param {HTMLElement} container
 * @returns {Record<string, any>}
 */
export function collectCriteriaFromForm(container) {
  const criteria = {};
  const inputs = container.querySelectorAll('input');
  for (const input of inputs) {
    const key = input.dataset.key || input.name;
    if (!key) continue;
    if (input.type === 'checkbox') {
      if (!criteria[key]) criteria[key] = [];
      if (input.checked) criteria[key].push(input.value);
    } else if (input.type === 'number') {
      const role = input.dataset.role;
      if (!criteria[key]) criteria[key] = {};
      if (input.value !== '') criteria[key][role] = Number(input.value);
    } else {
      if (input.value.trim() !== '') criteria[key] = input.value.trim();
    }
  }
  return criteria;
}

/**
 * URL群を再読み込みし、判定に合致しないエンティティを非表示にする
 * @param {Cesium.Viewer} viewer
 * @param {string[]} urls
 * @param {(feature: any) => boolean} predicate
 */
export async function applyFilterToUrls(viewer, urls, predicate) {
  for (const url of urls) {
    try {
      const ds = await Cesium.GeoJsonDataSource.load(url);
      const entities = ds.entities.values;
      for (const entity of entities) {
        const rawProps = {};
        if (entity.properties && entity.properties._propertyNames) {
          for (const key of entity.properties._propertyNames) {
            rawProps[key] = entity.properties.getValue(Cesium.JulianDate.now())[key];
          }
        }
        const fakeFeature = { properties: rawProps };
        const keep = predicate(fakeFeature);
        if (!keep) {
          entity.show = false;
        }
      }
      viewer.dataSources.add(ds);
    } catch (e) {
      console.error('フィルター適用時のロード失敗', url, e);
    }
  }
}

