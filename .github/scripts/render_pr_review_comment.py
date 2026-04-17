from __future__ import annotations

import argparse
import json
from pathlib import Path


MARKER = "<!-- ai-pr-review-summary -->"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    data = json.loads(Path(args.input).read_text())

    verdict = data["verdict"]
    confidence = data.get("confidence", 0)
    reasons = data.get("reasons", [])
    violated_docs = data.get("violated_docs", [])
    referenced_paths = data.get("referenced_paths", [])
    review_comments = data.get("review_comments", [])

    lines = [
        MARKER,
        "## AI PR Review",
        "",
        f"- Verdict: `{verdict}`",
        f"- Confidence: `{confidence:.2f}`" if isinstance(confidence, (int, float)) else "- Confidence: `0.00`",
        "",
        "### Reasons",
    ]
    lines.extend([f"- {reason}" for reason in reasons] or ["- None"])
    lines.append("")
    lines.append("### Violated Docs")
    lines.extend([f"- `{path}`" for path in violated_docs] or ["- None"])
    lines.append("")
    lines.append("### Referenced Paths")
    lines.extend([f"- `{path}`" for path in referenced_paths] or ["- None"])
    lines.append("")
    lines.append("### Line Comments")
    lines.append(f"- {len(review_comments)} comment(s) prepared")

    Path(args.output).write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
