from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings
from app.services.vault_service import VaultService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("vault_sync")


async def main() -> None:
    settings = get_settings()
    logger.info("Initializing HashiCorp Vault synchronization...")
    logger.info("Vault Address: %s", settings.vault_addr)
    logger.info("Target Secret Path: %s (mount: %s)", settings.vault_secret_path, settings.vault_mount_point)

    vault_service = VaultService(settings)
    if not vault_service.is_configured():
        logger.error("Vault client is not configured. Please set VAULT_ADDR and VAULT_TOKEN in .env.")
        sys.exit(1)

    # 1. Health check
    logger.info("Step 1: Checking Vault health...")
    health = await vault_service.health_check()
    logger.info("Vault Health: %s", health)
    if health.get("status") == "error":
        logger.error("Could not reach HashiCorp Vault. Ensure the Vault server is running.")
        sys.exit(1)

    # 2. Collect current environment secrets to push
    secrets_to_sync = {}
    if settings.openai_api_key:
        secrets_to_sync["OPENAI_API_KEY"] = settings.openai_api_key
    if settings.database_url:
        secrets_to_sync["DATABASE_URL"] = settings.database_url
    if settings.pinecone_api_key:
        secrets_to_sync["PINECONE_API_KEY"] = settings.pinecone_api_key
    if settings.elasticsearch_password:
        secrets_to_sync["ELASTICSEARCH_PASSWORD"] = settings.elasticsearch_password

    if not secrets_to_sync:
        logger.warning("No secrets found in current environment to sync. Adding sample placeholder key.")
        secrets_to_sync["DATABASE_URL"] = settings.effective_database_url

    # 3. Write secrets to Vault KV v2
    logger.info("Step 2: Writing %d secrets to Vault...", len(secrets_to_sync))
    success = await vault_service.write_secrets(secrets_to_sync)
    if success:
        logger.info("✓ Successfully wrote secrets to Vault.")
    else:
        logger.error("✗ Failed to write secrets to Vault.")
        sys.exit(1)

    # 4. Verify reading back
    logger.info("Step 3: Verifying secret retrieval from Vault...")
    stored = await vault_service.read_secrets()
    logger.info("✓ Successfully verified %d keys in Vault: %s", len(stored), list(stored.keys()))
    logger.info("Vault synchronization complete.")


if __name__ == "__main__":
    asyncio.run(main())
