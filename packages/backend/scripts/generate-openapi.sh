#!/bin/bash

# OpenAPI定義を生成するスクリプト

set -e

echo "🚀 OpenAPI定義を生成中..."

# Docker内でPythonスクリプト実行（volumeマウントで自動的にホスト側にも反映）
docker-compose exec -T api python scripts/generate_openapi.py

echo "✅ 完了: openapi.json が生成されました"
echo "📍 場所: packages/backend/openapi.json"
