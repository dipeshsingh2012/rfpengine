#!/usr/bin/env python3
"""
Cross-platform Chrome Extension packager.
Creates a clean, store-ready ZIP archive in dist/ excluding dev artifacts.
"""
import os
import json
import zipfile
from pathlib import Path

def package_extension():
    root_dir = Path(__file__).resolve().parent.parent
    ext_dir = root_dir / "extension"
    dist_dir = root_dir / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)
    
    # Read version from manifest.json
    manifest_path = ext_dir / "manifest.json"
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    version = manifest.get("version", "0.1.0")
    
    zip_path = dist_dir / f"rfpengine-extension-v{version}.zip"
    canonical_zip = dist_dir / "rfpengine-extension.zip"
    
    # Exclude files
    excluded_files = {".DS_Store", "README.md"}
    
    for target in [zip_path, canonical_zip]:
        if target.exists():
            target.unlink()
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, _, files in os.walk(ext_dir):
                for file in files:
                    if file in excluded_files or file.startswith("."):
                        continue
                    full_path = Path(root) / file
                    rel_path = full_path.relative_to(ext_dir)
                    zf.write(full_path, arcname=str(rel_path))
                    
        size_kb = target.stat().st_size / 1024
        print(f"✅ Created: {target} ({size_kb:.2f} KB)")

if __name__ == "__main__":
    package_extension()
