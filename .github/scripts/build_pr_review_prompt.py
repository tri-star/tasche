from __future__ import annotations

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--body-file", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    metadata = json.loads(Path(args.metadata).read_text())
    body_path = Path(args.body_file)

    prompt = f"""Use the pr-review agent for this task.

Before reviewing the PR, use the /review-context skill to generate review context with the following inputs:
- base_ref: {metadata["base_ref"]}
- repo: {metadata["repo"]}
- pr_number: {metadata["pr_number"]}
- title: {metadata["title"]}
- body_file: {body_path.as_posix()}
- author: {metadata["author"]}
- output_dir: tmp/review

After the skill completes:
1. Read `tmp/review/pr-metadata.json`
2. Read `tmp/review/context.json`
3. Read the required docs in `tmp/review/required-docs/`
4. Review the PR according to `.github/agents/pr-review.agent.md`
5. Output JSON only and follow the agent output schema exactly

Do not output markdown. Do not output explanations outside JSON.
"""
    Path(args.output).write_text(prompt)


if __name__ == "__main__":
    main()
