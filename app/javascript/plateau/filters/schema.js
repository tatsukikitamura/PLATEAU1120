/**
 * スキーマ処理機能
 */

/**
 * スキーマJSONを取得する
 * @param {string} schemaPath - スキーマファイルへの相対パス
 * @returns {Promise<Object>} スキーマオブジェクト
 */
export async function loadSchema(schemaPath) {
  const res = await fetch(schemaPath);
  if (!res.ok) {
    throw new Error(`スキーマの読み込みに失敗: ${schemaPath}`);
  }
  return await res.json();
}

/**
 * スキーマからプロパティ定義を抽出する
 * @param {Object} schema - スキーマオブジェクト
 * @returns {Array<{key: string, type: string, enum?: string[]}>} プロパティフィールドの配列
 */
export function extractPropertyFields(schema) {
  const defs = schema && schema.definitions;
  const facility = defs && defs.FacilityProperties;
  const props = facility && facility.properties;
  if (!props) return [];

  return Object.entries(props).map(([key, def]) => {
    const field = { key, type: def.type || "string" };
    if (def.enum) field.enum = def.enum;
    return field;
  });
}

/**
 * UI入力値からフィーチャーフィルタ関数を生成する
 * @param {Record<string, any>} criteria - フィルタ条件
 * @returns {(feature: any) => boolean} フィルタ関数
 */
export function buildPredicateFromCriteria(criteria) {
  return function predicate(feature) {
    const p = feature && feature.properties ? feature.properties : {};

    // 文字列: 部分一致（前後空白除去、空なら無視）
    if (typeof criteria.name === "string" && criteria.name.trim() !== "") {
      const q = criteria.name.trim();
      if (!String(p.name || "").includes(q)) return false;
    }

    // Enum: 複数選択のいずれか一致（未選択は無視）
    if (Array.isArray(criteria.category) && criteria.category.length > 0) {
      if (!criteria.category.includes(p.category)) return false;
    }

    // 数値: min/maxの範囲（未入力は無視）
    if (criteria.height_meters) {
      const value = Number(p.height_meters);
      if (Number.isFinite(criteria.height_meters.min)) {
        if (!(value >= Number(criteria.height_meters.min))) return false;
      }
      if (Number.isFinite(criteria.height_meters.max)) {
        if (!(value <= Number(criteria.height_meters.max))) return false;
      }
    }

    return true;
  };
}
