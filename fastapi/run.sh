#!/bin/bash

# FastAPIアプリケーションを起動するスクリプト

# .envファイルの確認
if [ ! -f .env ]; then
    echo "警告: .envファイルが見つかりません。env.exampleをコピーして設定してください。"
    echo "cp env.example .env"
    exit 1
fi

# 依存関係のインストール確認
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "仮想環境が見つかりません。作成しますか？ (y/n)"
    read -r response
    if [ "$response" = "y" ]; then
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    else
        echo "仮想環境を作成してから実行してください。"
        exit 1
    fi
fi

# 仮想環境をアクティブ化
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# アプリケーションを起動
echo "FastAPIアプリケーションを起動します..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

