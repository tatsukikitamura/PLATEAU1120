/**
 * フィルタUIフォーム生成機能
 */

/**
 * スキーマフィールドからフィルタUIを生成する
 * @param {HTMLElement} container - フォームを配置するコンテナ要素
 * @param {Array<{key:string, type:string, enum?:string[]}>} fields - フィールド定義の配列
 * @param {Object} criteria - 現在のフィルタ条件
 */
export function renderFilterFields(container, fields, criteria) {
  if (!container) return;
  container.innerHTML = "";

  for (const field of fields) {
    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "8px";

    const label = document.createElement("label");
    label.textContent = field.key;
    label.style.display = "block";
    label.style.fontWeight = "bold";
    wrapper.appendChild(label);

    if (field.enum && Array.isArray(field.enum)) {
      // Enum型: チェックボックス
      const box = document.createElement("div");
      for (const opt of field.enum) {
        const id = `f_${field.key}_${opt}`;
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = id;
        cb.name = field.key;
        cb.value = opt;
        cb.checked = Array.isArray(criteria[field.key])
          ? criteria[field.key].includes(opt)
          : false;

        const l = document.createElement("label");
        l.htmlFor = id;
        l.textContent = opt;
        l.style.marginRight = "8px";

        box.appendChild(cb);
        box.appendChild(l);
      }
      wrapper.appendChild(box);
    } else if (field.type === "number") {
      // Number型: min/max入力
      const min = document.createElement("input");
      min.type = "number";
      min.placeholder = "min";
      min.value = criteria[field.key]?.min ?? "";
      min.style.width = "45%";
      min.dataset.role = "min";
      min.dataset.key = field.key;

      const max = document.createElement("input");
      max.type = "number";
      max.placeholder = "max";
      max.value = criteria[field.key]?.max ?? "";
      max.style.width = "45%";
      max.style.marginLeft = "6px";
      max.dataset.role = "max";
      max.dataset.key = field.key;

      wrapper.appendChild(min);
      wrapper.appendChild(max);
    } else {
      // String型: テキスト入力
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = `${field.key} を含む...`;
      input.value = criteria[field.key] ?? "";
      input.dataset.key = field.key;
      wrapper.appendChild(input);
    }

    container.appendChild(wrapper);
  }
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
