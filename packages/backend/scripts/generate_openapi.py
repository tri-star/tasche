"""OpenAPI定義をファイルに書き出すスクリプト."""

import json
from pathlib import Path

from tasche.main import app


def generate_openapi_json():
    """OpenAPI定義をJSONファイルとして書き出す."""
    # OpenAPI定義を取得
    openapi_schema = app.openapi()

    # 出力先ファイルパス
    output_path = Path(__file__).parent.parent / "openapi.json"

    # JSONファイルとして書き出し
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, ensure_ascii=False, indent=2)

    print(f"✅ OpenAPI定義を生成しました: {output_path}")
    print(f"📄 ファイルサイズ: {output_path.stat().st_size} bytes")


if __name__ == "__main__":
    generate_openapi_json()
