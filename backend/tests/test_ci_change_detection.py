"""
Unit tests for CI/CD change detection logic.
"""

from pathlib import Path
import sys

# Add scripts directory to sys.path
scripts_dir = Path(__file__).parent.parent.parent / ".github" / "scripts"
sys.path.insert(0, str(scripts_dir))

from detect_changes import evaluate_changes


def test_evaluate_changes_backend_only():
    changed = ["backend/app/main.py", "backend/tests/test_api.py"]
    manifest = evaluate_changes(changed)
    assert manifest["backend"] is True
    assert manifest["frontend"] is False
    assert manifest["extension"] is False


def test_evaluate_changes_frontend_only():
    changed = ["frontend/src/App.tsx", "frontend/package.json"]
    manifest = evaluate_changes(changed)
    assert manifest["backend"] is False
    assert manifest["frontend"] is True
    assert manifest["extension"] is False


def test_evaluate_changes_global_taskfile():
    changed = ["Taskfile.yml"]
    manifest = evaluate_changes(changed)
    # Global Taskfile modification must trigger all test pipelines
    assert manifest["backend"] is True
    assert manifest["frontend"] is True
    assert manifest["extension"] is True


def test_evaluate_changes_empty_fallback():
    manifest = evaluate_changes([])
    assert manifest["backend"] is True
    assert manifest["frontend"] is True
