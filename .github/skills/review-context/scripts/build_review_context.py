from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[4]
REQUIRED_DOCS = [
    Path("docs/review/merge-judgement.md"),
    Path("docs/review/risk-map.yaml"),
    Path("docs/review/human-review-required.md"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-ref", required=True)
    parser.add_argument("--base-sha", required=True)
    parser.add_argument("--head-sha", required=True)
    parser.add_argument("--trusted-ref", required=True)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--head-repo", required=True)
    parser.add_argument("--pr-number", type=int, required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--body-file", required=True)
    parser.add_argument("--author", required=True)
    parser.add_argument("--output-dir", required=True)
    return parser.parse_args()


def run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def load_yaml(path: Path) -> dict:
    with path.open() as fh:
        return yaml.safe_load(fh) or {}


def changed_files(base_sha: str, head_sha: str) -> list[str]:
    output = run_git(["diff", "--name-only", f"{base_sha}...{head_sha}"])
    return [line for line in output.splitlines() if line.strip()]


def diff_patch(base_sha: str, head_sha: str) -> str:
    return run_git(["diff", f"{base_sha}...{head_sha}"])


def match_glob(path: str, patterns: list[str]) -> bool:
    candidate = Path(path)
    return any(candidate.match(pattern) for pattern in patterns)


def route_by_path(files: list[str], config: dict) -> list[dict]:
    matches: list[dict] = []
    for rule in config.get("rules", []):
        patterns = rule.get("match", [])
        if any(match_glob(path, patterns) for path in files):
            for candidate in rule.get("candidates", []):
                item = dict(candidate)
                item.setdefault("reason", f"path routing matched: {', '.join(patterns)}")
                matches.append(item)
    return matches


def route_by_keyword(haystacks: list[str], config: dict) -> list[dict]:
    text = "\n".join(haystacks).lower()
    matches: list[dict] = []
    for rule in config.get("rules", []):
        keywords = [keyword.lower() for keyword in rule.get("keywords", [])]
        if any(keyword in text for keyword in keywords):
            for candidate in rule.get("candidates", []):
                item = dict(candidate)
                item.setdefault("reason", f"keyword routing matched: {', '.join(keywords)}")
                matches.append(item)
    return matches


def dedupe_candidates(candidates: list[dict]) -> list[dict]:
    seen: dict[str, dict] = {}
    for candidate in candidates:
        path = candidate["path"]
        if path not in seen:
            seen[path] = candidate
    return list(seen.values())


def load_risk_hits(files: list[str]) -> list[dict]:
    risk_map_path = ROOT / "docs/review/risk-map.yaml"
    if not risk_map_path.exists():
        return []
    config = load_yaml(risk_map_path)
    hits: list[dict] = []
    for rule in config.get("rules", []):
        patterns = rule.get("paths", [])
        for path in files:
            if match_glob(path, patterns):
                hits.append(
                    {
                        "path": path,
                        "risk": rule.get("risk", "unknown"),
                        "reason": rule.get("reason", ""),
                    }
                )
    return hits


def ensure_required_docs(output_dir: Path) -> None:
    required_dir = output_dir / "required-docs"
    required_dir.mkdir(parents=True, exist_ok=True)
    for relative in REQUIRED_DOCS:
        source = ROOT / relative
        if source.exists():
            shutil.copy2(source, required_dir / relative.name)


def main() -> None:
    args = parse_args()
    output_dir = ROOT / args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    body = Path(args.body_file).read_text() if Path(args.body_file).exists() else ""
    files = changed_files(args.base_sha, args.head_sha)
    patch = diff_patch(args.base_sha, args.head_sha)

    path_routing = load_yaml(ROOT / "docs/review/context-routing.yaml")
    keyword_routing = load_yaml(ROOT / "docs/review/keyword-routing.yaml")

    path_candidates = route_by_path(files, path_routing)
    keyword_candidates = route_by_keyword([args.title, body, *files, patch], keyword_routing)
    candidates = dedupe_candidates(path_candidates + keyword_candidates)
    risk_hits = load_risk_hits(files)

    metadata = {
        "repo": args.repo,
        "pr_number": args.pr_number,
        "title": args.title,
        "body": body,
        "author": args.author,
        "base_ref": args.base_ref,
        "base_sha": args.base_sha,
        "head_sha": args.head_sha,
        "trusted_ref": args.trusted_ref,
        "head_repo": args.head_repo,
        "same_repo": args.head_repo == args.repo,
        "changed_files": files,
    }
    context = {
        "risk_map_hits": risk_hits,
        "candidate_files": candidates[:20],
        "file_access": {
            "trusted_workspace_ref": args.trusted_ref,
            "pr_file_command": f"git show {args.head_sha}:<path>",
            "base_file_command": f"git show {args.base_sha}:<path>",
            "notes": [
                "workspace 上のファイルは trusted ref の内容",
                "changed file の PR 版は git show で参照する",
                "unchanged file の周辺文脈は workspace から読んでよい",
            ],
        },
        "routing_sources": [
            "docs/review/context-routing.yaml",
            "docs/review/keyword-routing.yaml",
        ],
    }

    ensure_required_docs(output_dir)
    (output_dir / "pr-metadata.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False))
    (output_dir / "diff.patch").write_text(patch)
    (output_dir / "context.json").write_text(json.dumps(context, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
