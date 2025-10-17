/**
 * JSON Schema ローダとフィルター用メタデータ抽出
 */

/**
 * スキーマJSONを取得
 * @param {string} schemaPath - スキーマファイルへの相対パス
 * @returns {Promise<Object>} スキーマオブジェクト
 */
export async function loadSchema(schemaPath) {
  const res = await fetch(schemaPath);
  if (!res.ok) {
    throw new Error(`Failed to load schema: ${schemaPath}`);
  }
  return await res.json();
}

/**
 * スキーマからプロパティ定義を抽出
 * 現状、`definitions.FacilityProperties.properties` を対象とする
 * @param {Object} schema
 * @returns {Array<{key: string, type: string, enum?: string[]}>}
 */
export function extractPropertyFields(schema) {
  const defs = schema && schema.definitions;
  const facility = defs && defs.FacilityProperties;
  const props = facility && facility.properties;
  if (!props) return [];

  return Object.entries(props).map(([key, def]) => {
    const field = { key, type: def.type || 'string' };
    if (def.enum) field.enum = def.enum;
    return field;
  });
}

/**
 * 入力されたUI値からフィーチャーフィルタ関数を組み立て
 * - string: 部分一致（前後空白除去、空なら無視）
 * - number: min/maxの範囲（未入力は無視）
 * - enum: 複数選択のいずれか一致（未選択は無視）
 * @param {Record<string, any>} criteria
 * @returns {(feature: any) => boolean}
 */
export function buildPredicateFromCriteria(criteria) {
  return function predicate(feature) {
    const p = feature && feature.properties ? feature.properties : {};

    // string contains
    if (typeof criteria.name === 'string' && criteria.name.trim() !== '') {
      const q = criteria.name.trim();
      if (!String(p.name || '').includes(q)) return false;
    }

    // enum includes
    if (Array.isArray(criteria.category) && criteria.category.length > 0) {
      if (!criteria.category.includes(p.category)) return false;
    }

    // number range
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


