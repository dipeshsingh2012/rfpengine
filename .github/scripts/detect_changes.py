#!/usr/bin/env python3
"""
Change detection script for Fast-Path CI/CD.
Inspects git diffs against base branch and outputs change_manifest.json.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List


def get_changed_files(base_ref: str = "origin/main") -> List[str]:
    """Retrieve list of modified/added files compared to base branch."""
    try:
        res = subprocess.run(
            ["git", "diff", "--name-only", f"{base_ref}...HEAD"],
            capture_output=True,
            text=True,
            check=False,
        )
        if res.returncode == 0 and res.stdout.strip():
            return [line.strip() for line in res.stdout.strip().splitlines() if line.strip()]

        res_prev = subprocess.run(
            ["git", "diff", "--name-only", "HEAD~1", "HEAD"],
            capture_output=True,
            text=True,
            check=False,
        )
        if res_prev.returncode == 0 and res_prev.stdout.strip():
            return [line.strip() for line in res_prev.stdout.strip().splitlines() if line.strip()]

        res_status = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
            check=False,
        )
        if res_status.returncode == 0 and res_status.stdout.strip():
            files = []
            for line in res_status.stdout.strip().splitlines():
                parts = line.strip().split(None, 1)
                if len(parts) == 2:
                    files.append(parts[1])
            return files
    except Exception as e:
        print(f"[WARN] Error inspecting git diff: {e}", file=sys.stderr)

    return []


def evaluate_changes(changed_files: List[str]) -> Dict[str, bool]:
    """
    Evaluates changed file paths and returns boolean triggers for each module.
    If changed_files is empty (or contains root CI/Taskfile changes), defaults all to True for safety.
    """
    if not changed_files:
        return {
            "backend": True,
            "frontend": True,
            "extension": True,
            "docs": True,
        }

    manifest = {
        "backend": False,
        "frontend": False,
        "extension": False,
        "docs": False,
    }

    global_triggers = {
        "Taskfile.yml",
        ".github/workflows/ci.yml",
        ".github/scripts/detect_changes.py",
        "docker-compose.yml",
        ".env.example",
    }

    for path_str in changed_files:
        path = Path(path_str)
        filename = path.name

        if str(path) in global_triggers or filename in global_triggers:
            return {
                "backend": True,
                "frontend": True,
                "extension": True,
                "docs": True,
            }

        parts = path.parts
        if not parts:
            continue

        top_dir = parts[0]
        if top_dir == "backend":
            manifest["backend"] = True
        elif top_dir == "frontend":
            manifest["frontend"] = True
        elif top_dir == "extension":
            manifest["extension"] = True
        elif top_dir in ["docs", "RFC", "ADR"] or filename.endswith(".md"):
            manifest["docs"] = True
        else:
            manifest["backend"] = True
            manifest["frontend"] = True

    return manifest


def main():
    base_ref = os.getenv("BASE_REF", "origin/main")
    changed_files = get_changed_files(base_ref=base_ref)
    manifest = evaluate_changes(changed_files)

    output_path = Path("change_manifest.json")
    output_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"📋 Generated Change Manifest ({output_path}):")
    print(json.dumps(manifest, indent=2))

    github_output = os.getenv("GITHUB_OUTPUT")
    if github_output and os.path.exists(github_output):
        with open(github_output, "a", encoding="utf-8") as f:
            for k, v in manifest.items():
                f.write(f"{k}={str(v).lower()}\n")
            f.write(f"manifest={json.dumps(manifest)}\n")


if __name__ == "__main__":
    main()
