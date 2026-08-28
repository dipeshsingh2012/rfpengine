from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Optional

from app.core.config import Settings

logger = logging.getLogger(__name__)


class GCPSecretService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.project_id = settings.gcp_project_id
        self.prefix = settings.gcp_secret_prefix
        self.client = None

        try:
            from google.cloud import secretmanager
            self.client = secretmanager.SecretManagerServiceClient()
        except Exception as exc:
            logger.warning("Could not initialize GCP Secret Manager client: %s", exc)

    def is_configured(self) -> bool:
        return self.client is not None and bool(self.project_id)

    async def health_check(self) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "status": "unconfigured",
                "details": "GCP_PROJECT_ID is not set or client unavailable",
            }
        try:
            parent = f"projects/{self.project_id}"
            # Check permission / API availability by listing 1 secret
            pager = await asyncio.to_thread(self.client.list_secrets, parent=parent, page_size=1)
            return {
                "status": "ok",
                "project_id": self.project_id,
                "details": f"Connected to GCP Secret Manager (project: {self.project_id})",
            }
        except Exception as exc:
            return {
                "status": "error",
                "project_id": self.project_id,
                "details": f"GCP Secret Manager error: {exc}",
            }

    async def get_secret(self, secret_id: str, version_id: str = "latest") -> Optional[str]:
        """
        Retrieves a single secret payload from GCP Secret Manager.
        """
        if not self.is_configured():
            return None

        name = f"projects/{self.project_id}/secrets/{secret_id}/versions/{version_id}"
        try:
            response = await asyncio.to_thread(self.client.access_secret_version, name=name)
            return response.payload.data.decode("UTF-8")
        except Exception as exc:
            logger.warning("Could not access GCP secret '%s': %s", secret_id, exc)
            return None

    async def get_all_app_secrets(self) -> Dict[str, str]:
        """
        Fetches all secrets for this application from GCP Secret Manager.
        """
        if not self.is_configured():
            return {}

        parent = f"projects/{self.project_id}"
        secrets_dict: Dict[str, str] = {}
        try:
            pager = await asyncio.to_thread(self.client.list_secrets, parent=parent)
            for secret in pager:
                secret_name = secret.name.split("/")[-1]
                if not self.prefix or secret_name.startswith(self.prefix):
                    val = await self.get_secret(secret_name)
                    if val is not None:
                        # Strip prefix for internal mapping if present
                        clean_key = secret_name[len(self.prefix):] if self.prefix else secret_name
                        secrets_dict[clean_key] = val

            logger.info("Retrieved %d secrets from GCP Secret Manager.", len(secrets_dict))
            return secrets_dict
        except Exception as exc:
            logger.warning("Failed to list/retrieve secrets from GCP Secret Manager: %s", exc)
            return {}

    async def create_or_update_secret(self, secret_id: str, payload: str) -> bool:
        """
        Creates a secret or adds a new version in GCP Secret Manager.
        """
        if not self.is_configured():
            logger.error("GCP Secret Manager client is not configured with a project ID.")
            return False

        parent = f"projects/{self.project_id}"
        full_secret_name = f"{self.prefix}{secret_id}" if self.prefix and not secret_id.startswith(self.prefix) else secret_id

        # 1. Create Secret container if it doesn't exist
        try:
            await asyncio.to_thread(
                self.client.create_secret,
                parent=parent,
                secret_id=full_secret_name,
                secret={"replication": {"automatic": {}}},
            )
            logger.info("Created GCP secret container '%s'", full_secret_name)
        except Exception:
            pass  # Secret container may already exist

        # 2. Add secret version
        try:
            secret_parent = f"projects/{self.project_id}/secrets/{full_secret_name}"
            await asyncio.to_thread(
                self.client.add_secret_version,
                parent=secret_parent,
                payload={"data": payload.encode("UTF-8")},
            )
            logger.info("Successfully uploaded new version for secret '%s'", full_secret_name)
            return True
        except Exception as exc:
            logger.error("Failed to add secret version for '%s': %s", full_secret_name, exc)
            return False

