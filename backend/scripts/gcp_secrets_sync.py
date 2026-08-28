from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings
from app.services.gcp_secret_service import GCPSecretService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("gcp_secrets_sync")


async def main() -> None:
    settings = get_settings()
    logger.info("Initializing GCP Secret Manager synchronization...")
    logger.info("GCP Project ID: %s", settings.gcp_project_id or "(not set in .env)")

    if not settings.gcp_project_id:
        logger.error("Please set GCP_PROJECT_ID in your .env file or environment.")
        sys.exit(1)

    gcp_service = GCPSecretService(settings)
    if not gcp_service.is_configured():
        logger.error("GCP Secret Manager client is not configured.")
        sys.exit(1)

    # 1. Health check
    logger.info("Step 1: Verifying GCP Secret Manager permissions...")
    health = await gcp_service.health_check()
    logger.info("Health status: %s", health)
    if health.get("status") == "error":
        logger.error("Failed to connect to GCP Secret Manager. Ensure gcloud is authenticated (gcloud auth application-default login).")
        sys.exit(1)

    # 2. Collect current environment secrets to sync
    secrets_to_sync = {}
    if settings.database_url:
        secrets_to_sync["DATABASE_URL"] = settings.database_url
    if settings.openai_api_key:
        secrets_to_sync["OPENAI_API_KEY"] = settings.openai_api_key
    if settings.pinecone_api_key:
        secrets_to_sync["PINECONE_API_KEY"] = settings.pinecone_api_key
    if settings.elasticsearch_password:
        secrets_to_sync["ELASTICSEARCH_PASSWORD"] = settings.elasticsearch_password

    if not secrets_to_sync:
        secrets_to_sync["DATABASE_URL"] = settings.effective_database_url

    # 3. Upload secrets
    logger.info("Step 2: Uploading %d secrets to GCP Secret Manager...", len(secrets_to_sync))
    success_count = 0
    for secret_name, secret_value in secrets_to_sync.items():
        ok = await gcp_service.create_or_update_secret(secret_name, secret_value)
        if ok:
            success_count += 1
            logger.info("✓ Secret '%s' synced successfully.", secret_name)
        else:
            logger.error("✗ Failed to sync secret '%s'.", secret_name)

    logger.info("Synced %d / %d secrets into GCP Secret Manager.", success_count, len(secrets_to_sync))


if __name__ == "__main__":
    asyncio.run(main())

