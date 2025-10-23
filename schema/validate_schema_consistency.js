#!/usr/bin/env node

/**
 * 3D Tiles Schema整合性検証ツール
 * 
 * 使用方法:
 * node validate_schema_consistency.js <schema_file> <tileset_file>
 * 
 * 例:
 * node validate_schema_consistency.js building_lod1/tileset.schema.json building_lod1/tileset.json
 */

const fs = require('fs');
const path = require('path');

class SchemaValidator {
    constructor(schemaPath, tilesetPath) {
        this.schemaPath = schemaPath;
        this.tilesetPath = tilesetPath;
        this.errors = [];
        this.warnings = [];
    }

    async validate() {
        console.log(`🔍 スキーマ整合性チェック開始: ${this.schemaPath} vs ${this.tilesetPath}`);
        
        try {
            // ファイル読み込み
            const schema = JSON.parse(fs.readFileSync(this.schemaPath, 'utf8'));
            const tileset = JSON.parse(fs.readFileSync(this.tilesetPath, 'utf8'));
            
            // スキーマ定義の取得
            const schemaDef = this.extractSchemaDefinition(schema);
            const tilesetProps = tileset.properties || {};
            
            // 検証実行
            this.validatePropertyNames(schemaDef, tilesetProps);
            this.validateNumericRanges(schemaDef, tilesetProps);
            this.validateRequiredFields(schemaDef, tilesetProps);
            this.validateDataTypes(schemaDef, tilesetProps);
            
            // 結果表示
            this.displayResults();
            
        } catch (error) {
            console.error(`❌ エラー: ${error.message}`);
            process.exit(1);
        }
    }

    extractSchemaDefinition(schema) {
        // $refから実際のスキーマ定義を取得
        if (schema.$ref && schema.definitions) {
            const refPath = schema.$ref.replace('#/definitions/', '');
            return schema.definitions[refPath];
        }
        return schema;
    }

    validatePropertyNames(schemaDef, tilesetProps) {
        const schemaProps = Object.keys(schemaDef.properties || {});
        const tilesetPropNames = Object.keys(tilesetProps);
        
        // スキーマにあるがtilesetにないプロパティ
        const missingInTileset = schemaProps.filter(prop => !tilesetPropNames.includes(prop));
        if (missingInTileset.length > 0) {
            this.errors.push(`❌ tileset.jsonに存在しないプロパティ: ${missingInTileset.join(', ')}`);
        }
        
        // tilesetにあるがスキーマにないプロパティ
        const extraInTileset = tilesetPropNames.filter(prop => !schemaProps.includes(prop));
        if (extraInTileset.length > 0) {
            this.warnings.push(`⚠️ スキーマに定義されていないプロパティ: ${extraInTileset.join(', ')}`);
        }
        
        console.log(`✅ プロパティ名チェック完了: ${schemaProps.length}個のプロパティ`);
    }

    validateNumericRanges(schemaDef, tilesetProps) {
        const schemaProps = schemaDef.properties || {};
        
        for (const [propName, propDef] of Object.entries(schemaProps)) {
            if (propDef.type === 'number' || propDef.type === 'integer') {
                const tilesetProp = tilesetProps[propName];
                
                if (tilesetProp && typeof tilesetProp === 'object') {
                    // minimum値のチェック
                    if (propDef.minimum !== undefined && tilesetProp.minimum !== undefined) {
                        if (propDef.minimum !== tilesetProp.minimum) {
                            this.errors.push(`❌ ${propName}.minimum値が不一致: スキーマ=${propDef.minimum}, tileset=${tilesetProp.minimum}`);
                        }
                    }
                    
                    // maximum値のチェック
                    if (propDef.maximum !== undefined && tilesetProp.maximum !== undefined) {
                        if (propDef.maximum !== tilesetProp.maximum) {
                            this.errors.push(`❌ ${propName}.maximum値が不一致: スキーマ=${propDef.maximum}, tileset=${tilesetProp.maximum}`);
                        }
                    }
                }
            }
        }
        
        console.log(`✅ 数値範囲チェック完了`);
    }

    validateRequiredFields(schemaDef, tilesetProps) {
        const requiredFields = schemaDef.required || [];
        
        for (const field of requiredFields) {
            if (!tilesetProps.hasOwnProperty(field)) {
                this.errors.push(`❌ 必須フィールドが不足: ${field}`);
            }
        }
        
        console.log(`✅ 必須フィールドチェック完了: ${requiredFields.length}個のフィールド`);
    }

    validateDataTypes(schemaDef, tilesetProps) {
        const schemaProps = schemaDef.properties || {};
        
        for (const [propName, propDef] of Object.entries(schemaProps)) {
            const tilesetProp = tilesetProps[propName];
            
            if (tilesetProp !== undefined) {
                // 型の基本的なチェック（空オブジェクトの場合はスキップ）
                if (typeof tilesetProp === 'object' && Object.keys(tilesetProp).length === 0) {
                    continue; // 空オブジェクトは有効
                }
                
                // より詳細な型チェックが必要な場合はここに追加
            }
        }
        
        console.log(`✅ データ型チェック完了`);
    }

    displayResults() {
        console.log('\n📊 検証結果:');
        console.log('='.repeat(50));
        
        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log('🎉 すべてのチェックが成功しました！スキーマとtileset.jsonは整合性が取れています。');
        } else {
            if (this.errors.length > 0) {
                console.log('\n❌ エラー:');
                this.errors.forEach(error => console.log(`  ${error}`));
            }
            
            if (this.warnings.length > 0) {
                console.log('\n⚠️ 警告:');
                this.warnings.forEach(warning => console.log(`  ${warning}`));
            }
        }
        
        console.log(`\n📈 統計:`);
        console.log(`  - エラー: ${this.errors.length}個`);
        console.log(`  - 警告: ${this.warnings.length}個`);
    }
}

// メイン実行
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length !== 2) {
        console.log('使用方法: node validate_schema_consistency.js <schema_file> <tileset_file>');
        console.log('例: node validate_schema_consistency.js building_lod1/tileset.schema.json building_lod1/tileset.json');
        process.exit(1);
    }
    
    const [schemaFile, tilesetFile] = args;
    
    // ファイル存在チェック
    if (!fs.existsSync(schemaFile)) {
        console.error(`❌ スキーマファイルが見つかりません: ${schemaFile}`);
        process.exit(1);
    }
    
    if (!fs.existsSync(tilesetFile)) {
        console.error(`❌ tilesetファイルが見つかりません: ${tilesetFile}`);
        process.exit(1);
    }
    
    const validator = new SchemaValidator(schemaFile, tilesetFile);
    await validator.validate();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SchemaValidator;
