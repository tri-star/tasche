from __future__ import annotations

import argparse
import json
from pathlib import Path


SEVERITIES = {"blocking", "non-blocking"}
CATEGORIES = {"bug", "security", "performance", "readability", "maintainability", "test"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--rules", default=None)
    return parser.parse_args()


def load_known_rule_ids(rules_path: str | None) -> set[str]:
    if rules_path is None:
        return set()
    path = Path(rules_path)
    if not path.exists():
        return set()
    try:
        rules = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return set()
    if not isinstance(rules, list):
        return set()
    return {r["rule_id"] for r in rules if isinstance(r, dict) and isinstance(r.get("rule_id"), str)}


def extract_json_blob(text: str) -> dict | None:
    """Copilot CLIの標準出力から最後のJSONオブジェクトを抽出する。

    Copilot CLIはツール呼び出しの区切りごとに最終応答を出力する場合があり、
    同一内容のJSONが複数回連続して現れたり、前後に日本語の中間テキストが
    混在したりする。そのため text.find/rfind でのシンプルな切り出しではなく、
    raw_decode で先頭から順に全JSONオブジェクトを走査し、最後に見つかった
    dictを採用する。
    """
    decoder = json.JSONDecoder()
    results: list[dict] = []
    i, n = 0, len(text)
    while i < n:
        if text[i] != "{":
            i += 1
            continue
        try:
            obj, end = decoder.raw_decode(text, i)
        except json.JSONDecodeError:
            i += 1
            continue
        if isinstance(obj, dict):
            results.append(obj)
        i = end
    return results[-1] if results else None


def filter_rule_ids(raw: object, known_ids: set[str]) -> list[str]:
    if not isinstance(raw, list):
        return []
    return [r for r in raw if isinstance(r, str) and r in known_ids]


def normalize(data: dict | None, known_rule_ids: set[str] | None = None) -> dict:
    if known_rule_ids is None:
        known_rule_ids = set()

    if not isinstance(data, dict):
        return fallback("Copilot output was not valid JSON.")

    verdict = data.get("verdict")
    if verdict not in {"mergeable", "human-review"}:
        return fallback("Copilot output did not include a valid verdict.")

    confidence = data.get("confidence", 0)
    if not isinstance(confidence, (int, float)) or confidence < 0 or confidence > 1:
        confidence = 0

    reasons = data.get("reasons")
    if not isinstance(reasons, list) or not reasons:
        return fallback("Copilot output did not include any review reasons.")

    violated_docs = data.get("violated_docs", [])
    if not isinstance(violated_docs, list):
        violated_docs = []

    referenced_paths = data.get("referenced_paths", [])
    if not isinstance(referenced_paths, list):
        referenced_paths = []

    review_comments = data.get("review_comments", [])
    if not isinstance(review_comments, list):
        review_comments = []

    summary_comments = data.get("summary_comments", [])
    if not isinstance(summary_comments, list):
        summary_comments = []

    normalized_comments = []
    for item in review_comments:
        if not isinstance(item, dict):
            continue
        path = item.get("path")
        line = item.get("line")
        severity = item.get("severity")
        category = item.get("category")
        body = item.get("body")
        if not isinstance(path, str) or not path:
            continue
        if not isinstance(line, int) or line <= 0:
            continue
        if severity not in SEVERITIES:
            continue
        if category not in CATEGORIES:
            continue
        if not isinstance(body, str) or not body:
            continue
        normalized_comments.append(
            {
                "path": path,
                "line": line,
                "severity": severity,
                "category": category,
                "body": body,
                "applied_rule_ids": filter_rule_ids(item.get("applied_rule_ids"), known_rule_ids),
            }
        )

    normalized_summary_comments = []
    for item in summary_comments:
        if not isinstance(item, dict):
            continue
        severity = item.get("severity")
        category = item.get("category")
        body = item.get("body")
        if severity not in SEVERITIES:
            continue
        if category not in CATEGORIES:
            continue
        if not isinstance(body, str) or not body:
            continue
        normalized_summary_comments.append(
            {
                "severity": severity,
                "category": category,
                "body": body,
                "applied_rule_ids": filter_rule_ids(item.get("applied_rule_ids"), known_rule_ids),
            }
        )

    return {
        "verdict": verdict,
        "confidence": confidence,
        "reasons": reasons,
        "violated_docs": violated_docs,
        "referenced_paths": referenced_paths,
        "review_comments": normalized_comments,
        "summary_comments": normalized_summary_comments,
        "posted_summary_comments": [],
    }


def fallback(reason: str) -> dict:
    return {
        "verdict": "human-review",
        "confidence": 0,
        "reasons": [reason],
        "violated_docs": [],
        "referenced_paths": [],
        "review_comments": [],
        "summary_comments": [],
        "posted_summary_comments": [],
    }


def main() -> None:
    args = parse_args()
    raw = Path(args.input).read_text()
    data = extract_json_blob(raw)
    known_rule_ids = load_known_rule_ids(args.rules)
    normalized = normalize(data, known_rule_ids)
    Path(args.output).write_text(json.dumps(normalized, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
