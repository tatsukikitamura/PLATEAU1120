#!/bin/bash

# 全tilesetファイルの整合性を一括チェックするスクリプト

echo "🔍 全tilesetファイルのスキーマ整合性チェック開始"
echo "=================================================="

# チェック対象のディレクトリ
TILESET_DIR="public/data/tileset"

# 結果を格納する配列
declare -a RESULTS

# 各tilesetディレクトリをチェック
for dir in "$TILESET_DIR"/*/; do
    if [ -d "$dir" ]; then
        dirname=$(basename "$dir")
        schema_file="$dir/tileset.schema.json"
        tileset_file="$dir/tileset.json"
        
        echo ""
        echo "📁 チェック中: $dirname"
        echo "----------------------------------------"
        
        # ファイル存在チェック
        if [ ! -f "$schema_file" ]; then
            echo "❌ スキーマファイルが見つかりません: $schema_file"
            RESULTS+=("$dirname: スキーマファイルなし")
            continue
        fi
        
        if [ ! -f "$tileset_file" ]; then
            echo "❌ tilesetファイルが見つかりません: $tileset_file"
            RESULTS+=("$dirname: tilesetファイルなし")
            continue
        fi
        
        # Node.js検証ツールを使用
        if command -v node &> /dev/null; then
            echo "🔧 Node.js検証ツールでチェック中..."
            node validate_schema_consistency.js "$schema_file" "$tileset_file"
            
            if [ $? -eq 0 ]; then
                echo "✅ $dirname: 整合性OK"
                RESULTS+=("$dirname: OK")
            else
                echo "❌ $dirname: 整合性エラー"
                RESULTS+=("$dirname: ERROR")
            fi
        else
            # Node.jsがない場合は基本的なチェック
            echo "⚠️ Node.jsが利用できないため、基本的なチェックのみ実行"
            
            # プロパティ数の比較
            schema_props=$(grep -c '"[a-zA-Z_][a-zA-Z0-9_]*"' "$schema_file")
            tileset_props=$(grep -c '"[a-zA-Z_][a-zA-Z0-9_]*"' "$tileset_file")
            
            echo "📊 スキーマプロパティ数: $schema_props"
            echo "📊 tilesetプロパティ数: $tileset_props"
            
            if [ "$schema_props" -eq "$tileset_props" ]; then
                echo "✅ $dirname: プロパティ数一致"
                RESULTS+=("$dirname: プロパティ数OK")
            else
                echo "⚠️ $dirname: プロパティ数不一致"
                RESULTS+=("$dirname: プロパティ数不一致")
            fi
        fi
    fi
done

echo ""
echo "📋 最終結果サマリー"
echo "=================="
for result in "${RESULTS[@]}"; do
    echo "  $result"
done

echo ""
echo "🎯 推奨事項:"
echo "  - Node.jsが利用可能な場合は、詳細な検証ツールを使用"
echo "  - 定期的にこのスクリプトを実行して整合性を維持"
echo "  - CI/CDパイプラインに組み込むことを推奨"
