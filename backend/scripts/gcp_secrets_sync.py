#!/usr/bin/env python3
"""
GCP Secret Manager Synchronization CLI for RFPEngine.

Syncs required project environment secrets from local .env to GCP Secret Manager
or audits existing secrets in GCP Secret Manager against project requirements.
"""

import argparse
import asyncio
import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import get_settings
from app.services.gcp_secret_service import GCPSecretService

REQUIRED_PROJECT_SECRETS = [
    ("DATABASE_URL", "PostgreSQL database connection string (Neon)"),
    ("ELASTICSEARCH_API_KEY", "Elastic Cloud API key for BM25 indexing"),
    ("PINECONE_API_KEY", "Pinecone API Key for dense vector similarity search"),
]


async def audit_secrets(service: GCPSecretService):
    settings = service.settings
    print("=" * 70)
    print(f"🔒 GCP Secret Manager Audit (Project: {settings.gcp_project_id})")
    print("=" * 70)

    health = await service.health_check()
    if health.get("status") != "ok":
        print(f"❌ GCP Secret Manager Connection Failed: {health.get('details')}")
        return

    print("✅ GCP Secret Manager API Connected\n")
    remote_secrets = await service.get_all_app_secrets()
    
    print(f"Found {len(remote_secrets)} remote secrets under prefix '{settings.gcp_secret_prefix}':")
    
    for key, desc in REQUIRED_PROJECT_SECRETS:
        matched = None
        for r_k in remote_secrets.keys():
            norm_rk = r_k.upper().replace("-", "_")
            if norm_rk == key or norm_rk.endswith(key):
                matched = r_k
                break
        
        status_icon = "✅" if matched else "⚠️ [Missing]"
        print(f"  {status_icon} {key:<25} -> {desc}")


async def sync_secrets(service: GCPSecretService):
    settings = service.settings
    print("=" * 70)
    print(f"🚀 Syncing Project Secrets to GCP Secret Manager (Project: {settings.gcp_project_id})")
    print("=" * 70)

    if not service.is_configured():
        print("❌ GCP Secret Manager is not configured. Set GCP_PROJECT_ID in .env")
        return

    secret_values = {
        "database-url": settings.database_url,
        "elasticsearch-api-key": settings.elasticsearch_api_key,
        "pinecone-api-key": settings.pinecone_api_key,
    }

    for secret_id, val in secret_values.items():
        if not val:
            print(f"  ⏭️  Skipping empty secret: {secret_id}")
            continue
        
        success = await service.create_or_update_secret(secret_id, val)
        if success:
            print(f"  ✅ Synced: {secret_id}")
        else:
            print(f"  ❌ Failed to sync: {secret_id}")

    print("\nSynchronization complete.")


def main():
    parser = argparse.ArgumentParser(description="Sync RFPEngine secrets with GCP Secret Manager")
    parser.add_argument("--sync", action="store_true", help="Push non-empty local settings to GCP Secret Manager")
    args = parser.parse_args()

    settings = get_settings()
    service = GCPSecretService(settings)

    if args.sync:
        asyncio.run(sync_secrets(service))
    else:
        asyncio.run(audit_secrets(service))


if __name__ == "__main__":
    main()
