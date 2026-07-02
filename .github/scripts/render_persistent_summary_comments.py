from __future__ import annotations

import argparse
import json
from pathlib import Path


MARKER = "<!-- ai-pr-review-summary-persistent -->"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--pr-number", required=True)
    parser.add_argument("--head-sha", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--run-attempt", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    data = json.loads(Path(args.input).read_text())
    comments = data.get("summary_comments", [])
    if not isinstance(comments, list):
        comments = []

    payloads = []
    for index, comment in enumerate(comments):
        if not isinstance(comment, dict):
            continue
        severity = comment.get("severity")
        category = comment.get("category")
        body = comment.get("body")
        if not isinstance(severity, str) or not isinstance(category, str) or not isinstance(body, str):
            continue
        applied_rule_ids = comment.get("applied_rule_ids", [])
        if not isinstance(applied_rule_ids, list):
            applied_rule_ids = []
        applied_rule_ids = [r for r in applied_rule_ids if isinstance(r, str)]

        metadata = {
            "repo": args.repo,
            "pr_number": int(args.pr_number),
            "head_sha": args.head_sha,
            "run_id": args.run_id,
            "run_attempt": args.run_attempt,
            "summary_index": index,
            "severity": severity,
            "category": category,
        }
        lines = [
            MARKER,
            f"<!-- ai-pr-review-summary-metadata {json.dumps(metadata, ensure_ascii=False, sort_keys=True)} -->",
        ]
        for rule_id in applied_rule_ids:
            lines.append(f"<!-- RuleId: {rule_id} -->")
        lines.append(f"[{severity}/{category}] {body}")
        if severity == "non-blocking":
            lines.append("\n> この指摘は non-blocking です。別 PR での対応も可能です。")
        lines += [
            "",
            f"_AI review summary comment: run {args.run_id}, attempt {args.run_attempt}, item {index}_",
        ]
        comment_body = "\n".join(lines)
        payloads.append(
            {
                "summary_index": index,
                "severity": severity,
                "category": category,
                "body": comment_body,
            }
        )

    Path(args.output).write_text(json.dumps(payloads, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
