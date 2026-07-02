from __future__ import annotations

import argparse
import json
import subprocess
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


def list_rule_keys(bucket: str, package: str) -> list[str]:
    prefix = f"rules/package={package}/"
    result = subprocess.run(
        [
            "aws", "s3api", "list-objects-v2",
            "--bucket", bucket,
            "--prefix", prefix,
            "--query", "Contents[].Key",
            "--output", "json",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0 or not result.stdout.strip():
        return []
    try:
        keys = json.loads(result.stdout)
    except json.JSONDecodeError:
        return []
    if not isinstance(keys, list):
        return []
    return [k for k in keys if isinstance(k, str) and k.endswith(".json")]


def fetch_rule(bucket: str, key: str, package: str) -> dict | None:
    result = subprocess.run(
        ["aws", "s3", "cp", f"s3://{bucket}/{key}", "-"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return None
    try:
        obj = json.loads(result.stdout)
    except json.JSONDecodeError:
        return None
    if not isinstance(obj, dict):
        return None
    if not REQUIRED_KEYS.issubset(obj.keys()):
        return None
    if obj.get("package") != package:
        return None
    return obj


def main() -> None:
    args = parse_args()
    metadata = json.loads(Path(args.metadata).read_text())
    changed_files: list[str] = metadata.get("changed_files", [])

    packages = detect_packages(changed_files)
    rules: list[dict] = []
    seen_ids: set[str] = set()

    for package in packages:
        for key in list_rule_keys(args.bucket, package):
            rule = fetch_rule(args.bucket, key, package)
            if rule is None:
                continue
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
