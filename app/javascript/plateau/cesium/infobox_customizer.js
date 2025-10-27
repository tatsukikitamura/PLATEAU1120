/**
 * Cesium InfoBoxのカスタマイズ機能
 */

// プロパティ名の日本語翻訳マッピング
const PROPERTY_TRANSLATIONS = {
  parkName: "公園名",
  parkType: "公園種別",
  areaInService: "供用面積",
  stationName: "駅名",
  lineName: "路線名",
  operatorType: "運営者種別",
  railwayCategory: "鉄道種別",
  name: "名称",
  address: "住所",
  capacity: "収容人数",
  facilityType: "施設種別",
  disasterCategory: "災害種別",
  level: "レベル",
  height: "高さ",
  municipalityName: "市区町村名",
  prefectureName: "都道府県名"
};

/**
 * プロパティ名を日本語に翻訳
 * @param {string} key - プロパティ名
 * @returns {string} 日本語翻訳名
 */
function translatePropertyName(key) {
  return PROPERTY_TRANSLATIONS[key] || key;
}

/**
 * エンティティにdescriptionを設定する
 * @param {Cesium.Entity} entity - Cesiumエンティティ
 * @param {Object} properties - エンティティのプロパティ
 */
export function setEntityDescription(entity, properties) {
  if (!properties || !entity) {
    return;
  }

  try {
    // propertiesの構造を確認
    const props = properties._value || properties;
    if (!props || typeof props !== 'object') {
      return;
    }

    // descriptionをHTML形式で構築
    let description = '<div style="font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;">';
    description += '<table style="width: 100%; border-collapse: collapse; margin: 0;">';
    
    let rowCount = 0;
    for (const key in props) {
      if (props.hasOwnProperty(key) && key !== 'geometry') {
        const value = props[key];
        const displayValue = value !== null && value !== undefined ? String(value) : '';
        const displayKey = translatePropertyName(key); // 日本語翻訳
        
        description += `<tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="font-weight: 600; padding: 8px 12px; color: white; vertical-align: top; white-space: nowrap;">${escapeHtml(displayKey)}</td>
          <td style="padding: 8px 12px; color: white; vertical-align: top;">${escapeHtml(displayValue)}</td>
        </tr>`;
        rowCount++;
      }
    }
    
    description += '</table>';
    description += '</div>';
    
    // descriptionを設定
    entity.description = description;
  } catch (error) {
    console.error('Error setting entity description:', error);
  }
}

/**
 * エンティティ配列に対してdescriptionを一括設定
 * @param {Array<Cesium.Entity>} entities - エンティティ配列
 */
export function setDescriptionsForEntities(entities) {
  if (!entities || !Array.isArray(entities)) {
    return;
  }

  entities.forEach(entity => {
    if (entity.properties) {
      setEntityDescription(entity, entity.properties);
    }
  });
}

/**
 * HTMLエスケープ
 * @param {string} str - エスケープする文字列
 * @returns {string} エスケープされた文字列
 */
function escapeHtml(str) {
  if (typeof str !== 'string') {
    return String(str);
  }
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return str.replace(/[&<>"']/g, m => map[m]);
}

/**
 * InfoBoxのスタイルを動的に追加
 */
export function addInfoBoxStyles() {
  // 既に追加されている場合はスキップ
  if (document.getElementById('cesium-infobox-custom-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'cesium-infobox-custom-styles';
  style.textContent = `
    /* Cesium InfoBoxのカスタマイズ */
    .cesium-viewer-infoBoxContainer {
      top: 60px !important;
      right: 10px !important;
    }
    
    .cesium-viewer-infoBox {
      background: #1f2937 !important;
      border: none !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      overflow: hidden !important;
      max-width: 400px !important;
    }
    
    .cesium-infoBox-title {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      padding: 12px 16px !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      border: none !important;
      margin: 0 !important;
    }
    
    .cesium-infoBox-body {
      padding: 16px !important;
      background: #1f2937 !important;
      max-height: 400px !important;
      overflow-y: auto !important;
    }
    
    .cesium-infoBox-body table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 0 !important;
    }
    
    .cesium-infoBox-body table tr {
      transition: background-color 0.2s ease !important;
    }
    
    .cesium-infoBox-body table tr:hover {
      background-color: #374151 !important;
    }
    
    .cesium-infoBox-body table td:first-child {
      font-weight: 600 !important;
      color: white !important;
      width: 120px !important;
      padding: 8px 12px !important;
      vertical-align: top !important;
    }
    
    .cesium-infoBox-body table td:last-child {
      color: white !important;
      padding: 8px 12px !important;
      vertical-align: top !important;
      word-break: break-word !important;
    }
    
    /* スクロールバーのカスタマイズ */
    .cesium-infoBox-body::-webkit-scrollbar {
      width: 6px;
    }
    
    .cesium-infoBox-body::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    
    .cesium-infoBox-body::-webkit-scrollbar-thumb {
      background: #cbd5e0;
      border-radius: 10px;
    }
    
    .cesium-infoBox-body::-webkit-scrollbar-thumb:hover {
      background: #a0aec0;
    }
    
    /* 閉じるボタンのカスタマイズ */
    .cesium-infoBox-close {
      background-color: rgba(102, 126, 234, 0.8) !important;
      color: white !important;
      border: none !important;
      border-radius: 50% !important;
      width: 24px !important;
      height: 24px !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: background-color 0.2s ease !important;
    }
    
    .cesium-infoBox-close:hover {
      background-color: rgba(102, 126, 234, 1) !important;
    }
  `;
  
  document.head.appendChild(style);
}
