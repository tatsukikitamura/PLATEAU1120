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
 * スキーマからプロパティ定義を抽出する（強化版）
 * @param {Object} schema - スキーマオブジェクト
 * @returns {Array<{key: string, type: string, enum?: string[]}>} プロパティフィールドの配列
 */
export function extractPropertyFields(schema) {
  const defs = schema && schema.definitions;
  if (!defs) return [];

  // 複数のプロパティ定義を探す（FacilityProperties, Properties等）
  const propertyDefinitions = [
    defs.FacilityProperties,
    defs.Properties,
    defs.Welcome?.definitions?.Properties
  ].filter(Boolean);

  const allFields = [];

  for (const propDef of propertyDefinitions) {
    if (propDef && propDef.properties) {
      const fields = Object.entries(propDef.properties).map(([key, def]) => {
        const field = { key, type: determineFieldType(def) };
        
        // enum値を解決
        const enumValues = resolveEnumValues(def, defs);
        if (enumValues && enumValues.length > 0) {
          field.enum = enumValues;
        }
        
        return field;
      });
      allFields.push(...fields);
    }
  }

  // 重複を除去
  const uniqueFields = [];
  const seenKeys = new Set();
  
  for (const field of allFields) {
    if (!seenKeys.has(field.key)) {
      seenKeys.add(field.key);
      uniqueFields.push(field);
    }
  }

  return uniqueFields;
}

/**
 * フィールドの型を判定する
 * @param {Object} fieldDef - フィールド定義
 * @returns {string} フィールド型
 */
function determineFieldType(fieldDef) {
  // 明示的な型指定
  if (fieldDef.type) {
    // string型だがformatがintegerの場合は数値として扱う
    if (fieldDef.type === "string" && fieldDef.format === "integer") {
      return "number";
    }
    return fieldDef.type;
  }
  
  // $ref参照の場合は参照先を確認
  if (fieldDef.$ref) {
    return "string"; // デフォルトは文字列
  }
  
  return "string";
}

/**
 * enum値を解決する
 * @param {Object} fieldDef - フィールド定義
 * @param {Object} defs - スキーマのdefinitions
 * @returns {string[]|null} enum値の配列
 */
function resolveEnumValues(fieldDef, defs) {
  // 直接enumが定義されている場合
  if (fieldDef.enum) {
    return fieldDef.enum;
  }
  
  // $ref参照の場合
  if (fieldDef.$ref) {
    const refPath = fieldDef.$ref.replace("#/definitions/", "");
    const refDef = defs[refPath];
    if (refDef && refDef.enum) {
      return refDef.enum;
    }
  }
  
  return null;
}

/**
 * スキーマ駆動の汎用フィルターロジックエンジン
 * @param {Record<string, any>} criteria - フィルタ条件
 * @param {Array<{key: string, type: string, enum?: string[]}>} fields - フィールド定義配列
 * @returns {(feature: any) => boolean} フィルタ関数
 */
export function buildPredicateFromCriteria(criteria, fields = []) {
  let featureCount = 0;
  
  return function predicate(feature) {
    const p = feature && feature.properties ? feature.properties : {};
    featureCount++;
    
    const shouldLog = featureCount <= 2; // 最初の2件だけログ出力

    if (shouldLog) {
      console.log(`--- フィーチャー ${featureCount} の判定開始 ---`);
      console.log("プロパティ:", p);
    }

    // フィールド定義に基づいて動的にフィルタリング
    for (const field of fields) {
      const fieldValue = criteria[field.key];
      if (fieldValue === undefined || fieldValue === null || fieldValue === "") {
        continue; // 条件が設定されていない場合はスキップ
      }

      const propertyValue = p[field.key];
      
      if (shouldLog) {
        console.log(`フィールド[${field.key}]: 条件値=`, fieldValue, ", 実際値=", propertyValue, ", type=", field.type, ", hasEnum=", !!field.enum);
      }
      
      // enum型を最優先で判定（typeがstringでもenumがあればenum扱い）
      if (field.enum && Array.isArray(field.enum)) {
        // enum型: 複数選択のいずれか一致
        if (Array.isArray(fieldValue) && fieldValue.length > 0) {
          if (!fieldValue.includes(propertyValue)) {
            if (shouldLog) console.log(`→ enum不一致でfalse (${propertyValue} not in [${fieldValue.join(', ')}])`);
            return false;
          }
          if (shouldLog) console.log(`→ enum一致でOK`);
        }
      }
      // 文字列型: 部分一致（enumでない場合のみ）
      else if (field.type === "string") {
        if (typeof fieldValue === "string" && fieldValue.trim() !== "") {
          const searchTerm = fieldValue.trim();
          if (!String(propertyValue || "").includes(searchTerm)) {
            if (shouldLog) console.log(`→ 文字列不一致でfalse`);
            return false;
          }
        }
      }
      // 数値型: min/max範囲
      else if (field.type === "number" || field.type === "integer") {
        if (typeof fieldValue === "object" && fieldValue !== null) {
          const value = Number(propertyValue);
          if (Number.isFinite(fieldValue.min)) {
            if (!(value >= Number(fieldValue.min))) {
              if (shouldLog) console.log(`→ 数値min範囲外でfalse`);
              return false;
            }
          }
          if (Number.isFinite(fieldValue.max)) {
            if (!(value <= Number(fieldValue.max))) {
              if (shouldLog) console.log(`→ 数値max範囲外でfalse`);
              return false;
            }
          }
        }
      }
    }

    if (shouldLog) console.log(`→ 全条件クリアでtrue`);
    return true;
  };
}

/**
 * 複数スキーマから統合されたフィルターロジックを生成
 * @param {Record<string, any>} criteria - フィルタ条件（データ型プレフィックス付きキー）
 * @param {Object} schemaFieldsMap - データ型別のフィールド定義マップ
 * @returns {Object} データ型別のフィルタ関数マップ
 */
export function buildMultiSchemaPredicates(criteria, schemaFieldsMap) {
  const predicates = {};
  
  console.log("=== buildMultiSchemaPredicates 開始 ===");
  console.log("入力criteria:", criteria);
  
  for (const [dataType, fields] of Object.entries(schemaFieldsMap)) {
    // このデータ型用のcriteriaを抽出・変換
    const dataTypeCriteria = {};
    const prefix = `${dataType}_`;
    
    for (const [key, value] of Object.entries(criteria)) {
      if (key.startsWith(prefix)) {
        // プレフィックスを除去して元のキーを取得
        const originalKey = key.substring(prefix.length);
        dataTypeCriteria[originalKey] = value;
      }
    }
    
    console.log(`データ型[${dataType}]の変換後criteria:`, dataTypeCriteria);
    console.log(`データ型[${dataType}]のフィールド定義:`, fields.map(f => ({key: f.key, type: f.type, hasEnum: !!f.enum})));
    
    predicates[dataType] = buildPredicateFromCriteria(dataTypeCriteria, fields);
  }
  
  console.log("=== buildMultiSchemaPredicates 完了 ===");
  
  return predicates;
}
