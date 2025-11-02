/**
 * フィルタUIフォーム生成機能
 */

/**
 * 複数スキーマフィールドからフィルタUIを生成する（拡張版）
 * @param {HTMLElement} container - フォームを配置するコンテナ要素
 * @param {Object} schemaFieldsMap - データ型別のフィールド定義マップ
 * @param {Object} criteria - 現在のフィルタ条件
 */
export function renderFilterFields(container, schemaFieldsMap, criteria) {
  if (!container) return;
  container.innerHTML = "";

  // 全フィールドを統合（データ型別にグループ化）
  const allFields = [];
  for (const [dataType, fields] of Object.entries(schemaFieldsMap)) {
    for (const field of fields) {
      allFields.push({
        ...field,
        dataType,
        displayKey: `${dataType}_${field.key}` // データ型プレフィックス付与
      });
    }
  }

  // フィールド名でグループ化（同名フィールドの衝突解決）
  const fieldGroups = {};
  for (const field of allFields) {
    if (!fieldGroups[field.key]) {
      fieldGroups[field.key] = [];
    }
    fieldGroups[field.key].push(field);
  }

  for (const [fieldKey, fieldGroup] of Object.entries(fieldGroups)) {
    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "12px";
    wrapper.style.border = "1px solid #ddd";
    wrapper.style.padding = "8px";
    wrapper.style.borderRadius = "4px";

    // フィールド名ラベル
    const label = document.createElement("label");
    label.textContent = fieldKey;
    label.style.display = "block";
    label.style.fontWeight = "bold";
    label.style.marginBottom = "4px";
    wrapper.appendChild(label);

    // データ型が複数ある場合は表示
    if (fieldGroup.length > 1) {
      const dataTypeInfo = document.createElement("div");
      dataTypeInfo.textContent = `適用データ型: ${fieldGroup.map(f => f.dataType).join(", ")}`;
      dataTypeInfo.style.fontSize = "0.8em";
      dataTypeInfo.style.color = "#666";
      dataTypeInfo.style.marginBottom = "4px";
      wrapper.appendChild(dataTypeInfo);
    }

    // 最初のフィールド定義を使用してUIを生成
    const field = fieldGroup[0];
    const criteriaKey = field.displayKey;

    if (field.enum && Array.isArray(field.enum)) {
      // Enum型: チェックボックス
      const box = document.createElement("div");
      for (const opt of field.enum) {
        const id = `f_${criteriaKey}_${opt}`;
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = id;
        cb.name = criteriaKey;
        cb.value = opt;
        cb.checked = Array.isArray(criteria[criteriaKey])
          ? criteria[criteriaKey].includes(opt)
          : false;

        const l = document.createElement("label");
        l.htmlFor = id;
        l.textContent = opt;
        l.style.marginRight = "8px";
        l.style.fontSize = "0.9em";

        box.appendChild(cb);
        box.appendChild(l);
      }
      wrapper.appendChild(box);
    } else if (field.type === "number" || field.type === "integer") {
      // Number型: min/max入力
      const min = document.createElement("input");
      min.type = "number";
      min.placeholder = "最小値";
      min.value = criteria[criteriaKey]?.min ?? "";
      min.style.width = "45%";
      min.dataset.role = "min";
      min.dataset.key = criteriaKey;

      const max = document.createElement("input");
      max.type = "number";
      max.placeholder = "最大値";
      max.value = criteria[criteriaKey]?.max ?? "";
      max.style.width = "45%";
      max.style.marginLeft = "6px";
      max.dataset.role = "max";
      max.dataset.key = criteriaKey;

      wrapper.appendChild(min);
      wrapper.appendChild(max);
    } else {
      // String型: テキスト入力
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = `${fieldKey} を含む...`;
      input.value = criteria[criteriaKey] ?? "";
      input.dataset.key = criteriaKey;
      wrapper.appendChild(input);
    }

    container.appendChild(wrapper);
  }
}

/**
 * 単一スキーマフィールドからフィルタUIを生成する（後方互換性のため）
 * @param {HTMLElement} container - フォームを配置するコンテナ要素
 * @param {Array<{key:string, type:string, enum?:string[]}>} fields - フィールド定義の配列
 * @param {Object} criteria - 現在のフィルタ条件
 */
export function renderSingleSchemaFilterFields(container, fields, criteria) {
  const schemaFieldsMap = { default: fields };
  renderFilterFields(container, schemaFieldsMap, criteria);
}

/**
 * フォームから入力値を収集する
 * @param {HTMLElement} container - フォームコンテナ要素
 * @returns {Record<string, any>} フィルタ条件オブジェクト
 */
export function collectCriteriaFromForm(container) {
  const criteria = {};
  const inputs = container.querySelectorAll("input");

  for (const input of inputs) {
    const key = input.dataset.key || input.name;
    if (!key) continue;

    if (input.type === "checkbox") {
      if (!criteria[key]) criteria[key] = [];
      if (input.checked) criteria[key].push(input.value);
    } else if (input.type === "number") {
      const role = input.dataset.role;
      if (!criteria[key]) criteria[key] = {};
      if (input.value !== "") criteria[key][role] = Number(input.value);
    } else {
      if (input.value.trim() !== "") criteria[key] = input.value.trim();
    }
  }

  return criteria;
}
