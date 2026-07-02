from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path


REQUIRED_KEYS = {"rule_id", "name", "package", "category", "body"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata", required=True)
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def detect_packages(changed_files: list[str]) -> list[str]:
    packages: set[str] = set()
    for f in changed_files:
        if f.startswith("packages/frontend/"):
            packages.add("frontend")
        elif f.startswith("packages/backend/"):
            packages.add("backend")
    return sorted(packages) if packages else ["frontend", "backend"]


def fetch_rules_for_package(bucket: str, package: str) -> list[dict]:
    prefix = f"rules/package={package}/"
    rules: list[dict] = []
    with tempfile.TemporaryDirectory() as tmpdir:
        result = subprocess.run(
            [
                "aws", "s3", "cp",
                f"s3://{bucket}/{prefix}",
                tmpdir,
                "--recursive",
                "--exclude", "*",
                "--include", "*.json",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            return []
        for p in Path(tmpdir).glob("**/*.json"):
            try:
                obj = json.loads(p.read_text())
                if (
                    isinstance(obj, dict)
                    and REQUIRED_KEYS.issubset(obj.keys())
                    and obj.get("package") == package
                ):
                    rules.append(obj)
            except (json.JSONDecodeError, OSError):
                continue
    return rules


def main() -> None:
    args = parse_args()
    metadata = json.loads(Path(args.metadata).read_text())
    changed_files: list[str] = metadata.get("changed_files", [])

    packages = detect_packages(changed_files)
    rules: list[dict] = []
    seen_ids: set[str] = set()

    for package in packages:
        for rule in fetch_rules_for_package(args.bucket, package):
            rule_id = rule.get("rule_id")
            if not isinstance(rule_id, str) or not rule_id:
                continue
            if rule_id in seen_ids:
                continue
            seen_ids.add(rule_id)
            rules.append(rule)

    Path(args.output).write_text(json.dumps(rules, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
