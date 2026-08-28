from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Optional

from app.core.config import Settings

logger = logging.getLogger(__name__)


class VaultService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.vault_addr = settings.vault_addr
        self.vault_token = settings.vault_token
        self.secret_path = settings.vault_secret_path
        self.mount_point = settings.vault_mount_point
        self.client = None

        if settings.vault_addr:
            try:
                import hvac
                self.client = hvac.Client(url=self.vault_addr, token=self.vault_token)
            except Exception as exc:
                logger.warning("Could not initialize Vault client: %s", exc)

    def is_configured(self) -> bool:
        return self.client is not None and bool(self.vault_token)

    async def health_check(self) -> Dict[str, Any]:
        if not self.client:
            return {"status": "unconfigured", "details": "Vault client not initialized"}
        try:
            # sys.read_health_status is synchronous in hvac
            health = await asyncio.to_thread(self.client.sys.read_health_status, method="GET")
            is_sealed = getattr(health, "sealed", False) if not isinstance(health, dict) else health.get("sealed", False)
            initialized = getattr(health, "initialized", True) if not isinstance(health, dict) else health.get("initialized", True)
            version = getattr(health, "version", "unknown") if not isinstance(health, dict) else health.get("version", "unknown")
            
            return {
                "status": "sealed" if is_sealed else "ok",
                "initialized": initialized,
                "sealed": is_sealed,
                "version": str(version),
                "vault_addr": self.vault_addr,
            }
        except Exception as exc:
            return {"status": "error", "details": str(exc), "vault_addr": self.vault_addr}

    async def read_secrets(self, path: Optional[str] = None, mount_point: Optional[str] = None) -> Dict[str, Any]:
        """
        Reads secrets from HashiCorp Vault KV v2 secrets engine.
        """
        if not self.is_configured():
            return {}

        target_mount = mount_point or self.mount_point
        target_path = path or self.secret_path

        # If secret_path contains mount prefix (e.g. "secret/data/rfpengine" or "secret/rfpengine"), strip it for hvac kv2 call
        clean_path = target_path
        if clean_path.startswith(f"{target_mount}/data/"):
            clean_path = clean_path[len(f"{target_mount}/data/"):]
        elif clean_path.startswith(f"{target_mount}/"):
            clean_path = clean_path[len(f"{target_mount}/"):]

        try:
            secret_version_response = await asyncio.to_thread(
                self.client.secrets.kv.v2.read_secret_version,
                path=clean_path,
                mount_point=target_mount,
            )
            data = secret_version_response.get("data", {}).get("data", {})
            logger.info("Successfully fetched %d secrets from Vault at '%s/%s'", len(data), target_mount, clean_path)
            return data
        except Exception as exc:
            logger.warning("Could not read secrets from Vault (%s/%s): %s", target_mount, clean_path, exc)
            return {}

    async def write_secrets(
        self,
        secrets: Dict[str, Any],
        path: Optional[str] = None,
        mount_point: Optional[str] = None,
    ) -> bool:
        """
        Writes or updates secrets in HashiCorp Vault KV v2 secrets engine.
        """
        if not self.is_configured():
            logger.error("Vault client is not configured with token/URL.")
            return False

        target_mount = mount_point or self.mount_point
        target_path = path or self.secret_path

        clean_path = target_path
        if clean_path.startswith(f"{target_mount}/data/"):
            clean_path = clean_path[len(f"{target_mount}/data/"):]
        elif clean_path.startswith(f"{target_mount}/"):
            clean_path = clean_path[len(f"{target_mount}/"):]

        try:
            # Ensure KV v2 secrets engine is enabled at mount point
            try:
                await asyncio.to_thread(
                    self.client.sys.enable_secrets_engine,
                    backend_type="kv",
                    path=target_mount,
                    options={"version": "2"},
                )
            except Exception:
                pass  # Mount may already exist

            await asyncio.to_thread(
                self.client.secrets.kv.v2.create_or_update_secret,
                path=clean_path,
                secret=secrets,
                mount_point=target_mount,
            )
            logger.info("Successfully wrote %d secrets to Vault at '%s/%s'", len(secrets), target_mount, clean_path)
            return True
        except Exception as exc:
            logger.error("Failed to write secrets to Vault: %s", exc)
            return False
