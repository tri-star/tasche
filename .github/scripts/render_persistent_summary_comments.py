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
        comment_body = "\n".join(
            [
                MARKER,
                f"<!-- ai-pr-review-summary-metadata {json.dumps(metadata, ensure_ascii=False, sort_keys=True)} -->",
                f"[{severity}/{category}] {body}",
                "",
                f"_AI review summary comment: run {args.run_id}, attempt {args.run_attempt}, item {index}_",
            ]
        )
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
